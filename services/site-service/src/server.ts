import crypto from "node:crypto";
import { FastifyPluginAsync } from "fastify";

import { ServiceEnv, createServiceApp, query, requireAuth } from "@netlayer/platform";
import { buildCustomerDashboardUrl } from "./grafana";

const routes: FastifyPluginAsync = async (app) => {
  const canManagePlatformWorkspace = (user: any) =>
    Boolean(
      user &&
        !user.customerId &&
        user.roles?.some((role: string) => role === "SUPER_ADMIN" || role === "NOC_ENGINEER")
    );
  const canManageCustomerWorkspace = (user: any, customerId: string) =>
    Boolean(
      user &&
        ((canManagePlatformWorkspace(user)) ||
          (user.customerId === customerId &&
            user.roles?.some((role: string) => role === "ENTERPRISE_ADMIN" || role === "SUPER_ADMIN")))
    );
  const resolveScopedSiteIds = async (user: any, customerId: string): Promise<string[] | null> => {
    if (!user?.customerId || user.customerId !== customerId) {
      return null;
    }

    if (user.roles?.some((role: string) => role === "ENTERPRISE_ADMIN" || role === "SUPER_ADMIN")) {
      return null;
    }

    const scoped = await query<{ site_id: string }>(
      process.env.DATABASE_URL!,
      `
        SELECT cusa.site_id
        FROM customer_user_site_access cusa
        JOIN sites s ON s.id = cusa.site_id
        WHERE cusa.user_id = $1
          AND s.customer_id = $2
      `,
      [user.userId, customerId]
    );

    return scoped.rows.length > 0 ? scoped.rows.map((row) => row.site_id) : null;
  };
  const writeAuditLog = async (
    actorUserId: string | undefined,
    entityType: string,
    entityId: string,
    action: string,
    details: Record<string, unknown> = {}
  ) => {
    await query(
      process.env.DATABASE_URL!,
      `
        INSERT INTO audit_logs (actor_user_id, entity_type, entity_id, action, details)
        VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      [actorUserId ?? null, entityType, entityId, action, JSON.stringify(details)]
    );
  };
  // ─── Dashboard / Stats ──────────────────────────────────────────────────────

  app.get("/sites/stats", { preHandler: [requireAuth] }, async (request) => {
    const user = request.auth!;
    const filter = user.customerId ? "WHERE s.customer_id = $1" : "";
    const params = user.customerId ? [user.customerId] : [];

    const result = await query<{
      total: string;
      online: string;
      offline: string;
      degraded: string;
      maintenance: string;
    }>(
      process.env.DATABASE_URL!,
      `
        SELECT
          COUNT(*)::text AS total,
          COUNT(*) FILTER (WHERE s.status = 'UP')::text AS online,
          COUNT(*) FILTER (WHERE s.status = 'DOWN')::text AS offline,
          COUNT(*) FILTER (WHERE s.status = 'DEGRADED')::text AS degraded,
          COUNT(*) FILTER (WHERE s.status = 'MAINTENANCE')::text AS maintenance
        FROM sites s
        ${filter}
      `,
      params
    );

    const row = result.rows[0];
    return {
      total: Number(row?.total ?? 0),
      online: Number(row?.online ?? 0),
      offline: Number(row?.offline ?? 0),
      degraded: Number(row?.degraded ?? 0),
      maintenance: Number(row?.maintenance ?? 0)
    };
  });

  // ─── NOC / Admin Dashboard Stats ────────────────────────────────────────────

  app.get("/dashboard/stats", { preHandler: [requireAuth] }, async (request) => {
    const [siteStats, customerStats, serviceStats, revenueStats] = await Promise.all([
      query<{
        total: string; online: string; offline: string; degraded: string;
      }>(
        process.env.DATABASE_URL!,
        `SELECT
          COUNT(*)::text AS total,
          COUNT(*) FILTER (WHERE status = 'UP')::text AS online,
          COUNT(*) FILTER (WHERE status = 'DOWN')::text AS offline,
          COUNT(*) FILTER (WHERE status = 'DEGRADED')::text AS degraded
        FROM sites`
      ),
      query<{ total: string; enterprise: string; business: string; }>(
        process.env.DATABASE_URL!,
        `SELECT
          COUNT(*)::text AS total,
          COUNT(*) FILTER (WHERE tier = 'ENTERPRISE')::text AS enterprise,
          COUNT(*) FILTER (WHERE tier = 'BUSINESS')::text AS business
        FROM customers WHERE status = 'ACTIVE'`
      ),
      query<{ total: string; active: string; }>(
        process.env.DATABASE_URL!,
        `SELECT COUNT(*)::text AS total, COUNT(*) FILTER (WHERE status='ACTIVE')::text AS active FROM services`
      ),
      query<{ total_mrr: string; total_acv: string; }>(
        process.env.DATABASE_URL!,
        `SELECT
          COALESCE(SUM(monthly_recurring_revenue), 0)::text AS total_mrr,
          COALESCE(SUM(annual_contract_value), 0)::text AS total_acv
        FROM customers WHERE status = 'ACTIVE'`
      )
    ]);

    return {
      sites: {
        total:       Number(siteStats.rows[0]?.total ?? 0),
        online:      Number(siteStats.rows[0]?.online ?? 0),
        offline:     Number(siteStats.rows[0]?.offline ?? 0),
        degraded:    Number(siteStats.rows[0]?.degraded ?? 0)
      },
      customers: {
        total:      Number(customerStats.rows[0]?.total ?? 0),
        enterprise: Number(customerStats.rows[0]?.enterprise ?? 0),
        business:   Number(customerStats.rows[0]?.business ?? 0)
      },
      services: {
        total:  Number(serviceStats.rows[0]?.total ?? 0),
        active: Number(serviceStats.rows[0]?.active ?? 0)
      },
      revenue: {
        mrr: Number(revenueStats.rows[0]?.total_mrr ?? 0),
        acv: Number(revenueStats.rows[0]?.total_acv ?? 0)
      }
    };
  });

  // ─── Customers ──────────────────────────────────────────────────────────────

  app.get("/customers", { preHandler: [requireAuth] }, async (request) => {
    const user = request.auth!;
    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          c.id,
          c.name,
          c.code,
          c.tier,
          c.account_manager,
          c.status,
          c.industry,
          c.contract_end_date,
          c.monthly_recurring_revenue,
          c.annual_contract_value,
          c.sla_profile,
          p.name AS partner_name,
          COUNT(DISTINCT s.id)::text AS site_count
        FROM customers c
        LEFT JOIN partners p ON p.id = c.partner_id
        LEFT JOIN sites s ON s.customer_id = c.id
        ${user.customerId ? "WHERE c.id = $1" : ""}
        GROUP BY c.id, p.name
        ORDER BY c.name
      `,
      user.customerId ? [user.customerId] : []
    );

    return result.rows;
  });

  app.post("/customers", { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.auth!;
    if (!canManagePlatformWorkspace(user)) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const body = request.body as {
      name?: string;
      code?: string;
      tier?: string;
      industry?: string;
      accountManager?: string;
      slaProfile?: string;
      billingEmail?: string;
      primaryContactName?: string;
      primaryContactPhone?: string;
      primaryContactEmail?: string;
      zohoCustomerId?: string;
      gstin?: string;
      monthlyRecurringRevenue?: number;
      annualContractValue?: number;
      portalAdminEmail?: string;
      portalAdminFullName?: string;
      portalAdminPassword?: string;
    };

    if (
      !body.name ||
      !body.tier ||
      !body.accountManager ||
      !body.slaProfile ||
      !body.portalAdminEmail ||
      !body.portalAdminFullName ||
      !body.portalAdminPassword
    ) {
      return reply.code(400).send({ message: "name, tier, accountManager, slaProfile, and portal admin credentials are required" });
    }

    const normalizedEmail = body.portalAdminEmail.trim().toLowerCase();
    const existingUser = await query<{ id: string }>(
      process.env.DATABASE_URL!,
      `SELECT id FROM users WHERE email = $1`,
      [normalizedEmail]
    );

    if (existingUser.rows[0]) {
      return reply.code(409).send({ message: "Portal admin email already exists" });
    }

    const customerCode =
      body.code?.trim().toUpperCase() ||
      `CUST-${body.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase() || "NEW"}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

    const existingCustomer = await query<{ id: string }>(
      process.env.DATABASE_URL!,
      `SELECT id FROM customers WHERE code = $1`,
      [customerCode]
    );

    if (existingCustomer.rows[0]) {
      return reply.code(409).send({ message: "Customer code already exists" });
    }

    const insertedCustomer = await query<{
      id: string;
      name: string;
      code: string;
      tier: string;
      status: string;
      account_manager: string;
      industry: string | null;
      billing_email: string | null;
      primary_contact_name: string | null;
      primary_contact_phone: string | null;
      zoho_customer_id: string | null;
      gstin: string | null;
      monthly_recurring_revenue: string;
      annual_contract_value: string;
      sla_profile: string;
      created_at: string;
    }>(
      process.env.DATABASE_URL!,
      `
        INSERT INTO customers (
          code,
          name,
          tier,
          status,
          account_manager,
          sla_profile,
          industry,
          billing_email,
          primary_contact_name,
          primary_contact_phone,
          zoho_customer_id,
          gstin,
          monthly_recurring_revenue,
          annual_contract_value
        )
        VALUES ($1, $2, $3, 'ACTIVE', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING
          id,
          name,
          code,
          tier,
          status,
          account_manager,
          industry,
          billing_email,
          primary_contact_name,
          primary_contact_phone,
          zoho_customer_id,
          gstin,
          monthly_recurring_revenue::text,
          annual_contract_value::text,
          sla_profile,
          created_at::text
      `,
      [
        customerCode,
        body.name.trim(),
        body.tier.trim().toUpperCase(),
        body.accountManager.trim(),
        body.slaProfile.trim().toUpperCase(),
        body.industry?.trim() || null,
        body.billingEmail?.trim() || null,
        body.primaryContactName?.trim() || null,
        body.primaryContactPhone?.trim() || null,
        body.zohoCustomerId?.trim() || null,
        body.gstin?.trim() || null,
        Number(body.monthlyRecurringRevenue ?? 0),
        Number(body.annualContractValue ?? 0)
      ]
    );

    const customerRow = insertedCustomer.rows[0];
    if (!customerRow) {
      return reply.code(500).send({ message: "Failed to create customer" });
    }

    if (body.primaryContactName?.trim()) {
      await query(
        process.env.DATABASE_URL!,
        `
          INSERT INTO customer_contacts (
            customer_id,
            name,
            email,
            phone,
            designation,
            is_primary,
            contact_type
          )
          VALUES ($1, $2, $3, $4, $5, TRUE, 'ESCALATION')
        `,
        [
          customerRow.id,
          body.primaryContactName.trim(),
          body.primaryContactEmail?.trim() || body.billingEmail?.trim() || null,
          body.primaryContactPhone?.trim() || null,
          "Primary Contact"
        ]
      );
    }

    const insertedUser = await query<{ id: string }>(
      process.env.DATABASE_URL!,
      `
        INSERT INTO users (customer_id, email, full_name, password_hash, is_active)
        VALUES ($1, $2, $3, crypt($4, gen_salt('bf')), TRUE)
        RETURNING id
      `,
      [customerRow.id, normalizedEmail, body.portalAdminFullName.trim(), body.portalAdminPassword]
    );

    const portalAdminUserId = insertedUser.rows[0]?.id;
    if (!portalAdminUserId) {
      return reply.code(500).send({ message: "Customer created but portal admin creation failed" });
    }

    await query(
      process.env.DATABASE_URL!,
      `
        INSERT INTO user_roles (user_id, role_id)
        SELECT $1, id
        FROM roles
        WHERE name = 'ENTERPRISE_ADMIN'
        ON CONFLICT DO NOTHING
      `,
      [portalAdminUserId]
    );

    await writeAuditLog(user.userId, "customer", customerRow.id, "customer.created", {
      code: customerRow.code,
      portalAdminEmail: normalizedEmail,
      zohoCustomerId: customerRow.zoho_customer_id
    });

    reply.code(201);
    return {
      id: customerRow.id,
      name: customerRow.name,
      code: customerRow.code,
      tier: customerRow.tier,
      status: customerRow.status,
      industry: customerRow.industry,
      account_manager: customerRow.account_manager,
      sla_profile: customerRow.sla_profile,
      billing_email: customerRow.billing_email,
      primary_contact_name: customerRow.primary_contact_name,
      primary_contact_phone: customerRow.primary_contact_phone,
      monthly_recurring_revenue: Number(customerRow.monthly_recurring_revenue ?? 0),
      annual_contract_value: Number(customerRow.annual_contract_value ?? 0),
      created_at: customerRow.created_at
    };
  });

  app.get("/customers/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    if (user.customerId && user.customerId !== params.id) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          c.*,
          p.name AS partner_name,
          p.code AS partner_code
        FROM customers c
        LEFT JOIN partners p ON p.id = c.partner_id
        WHERE c.id = $1
      `,
      [params.id]
    );

    if (!result.rows[0]) {
      return reply.code(404).send({ message: "Customer not found" });
    }

    return result.rows[0];
  });

  app.get("/customers/:id/overview", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    if (user.customerId && user.customerId !== params.id) {
      return reply.code(403).send({ message: "Forbidden" });
    }
    const scopedSiteIds = await resolveScopedSiteIds(user, params.id);
    const servicesParams = scopedSiteIds ? [params.id, scopedSiteIds] : [params.id];
    const ticketsParams = scopedSiteIds ? [params.id, scopedSiteIds] : [params.id];

    const [customerResult, servicesResult, ticketResult, feasibilityResult] = await Promise.all([
      query<{
        id: string; name: string; status: string; sla_profile: string;
        account_manager: string; monthly_recurring_revenue: string;
        annual_contract_value: string; contract_end_date: string | null;
      }>(
        process.env.DATABASE_URL!,
        `SELECT id, name, status, sla_profile, account_manager,
          monthly_recurring_revenue::text, annual_contract_value::text, contract_end_date::text
         FROM customers WHERE id = $1`,
        [params.id]
      ),
      query<{ total_services: string; active_services: string; total_bandwidth_mbps: string; }>(
        process.env.DATABASE_URL!,
        `SELECT COUNT(*)::text AS total_services,
          COUNT(*) FILTER (WHERE status = 'ACTIVE')::text AS active_services,
          COALESCE(SUM(bandwidth_mbps), 0)::text AS total_bandwidth_mbps
         FROM services WHERE customer_id = $1
         ${scopedSiteIds ? "AND site_id = ANY($2::uuid[])" : ""}`,
        servicesParams
      ),
      query<{ open_tickets: string; breached_tickets: string; }>(
        process.env.DATABASE_URL!,
        `SELECT
          COUNT(*) FILTER (WHERE status IN ('OPEN','IN_PROGRESS'))::text AS open_tickets,
          COUNT(*) FILTER (WHERE status IN ('OPEN','IN_PROGRESS') AND resolution_due_at IS NOT NULL AND resolution_due_at <= NOW())::text AS breached_tickets
         FROM tickets WHERE customer_id = $1
         ${scopedSiteIds ? "AND (site_id IS NULL OR site_id = ANY($2::uuid[]))" : ""}`,
        ticketsParams
      ),
      query<{ open_feasibility: string; }>(
        process.env.DATABASE_URL!,
        `SELECT COUNT(*) FILTER (WHERE status NOT IN ('CONVERTED','CLOSED','NOT_FEASIBLE'))::text AS open_feasibility
         FROM feasibility_requests WHERE customer_id = $1`,
        [params.id]
      )
    ]);

    if (!customerResult.rows[0]) {
      return reply.code(404).send({ message: "Customer not found" });
    }

    return {
      customer: customerResult.rows[0],
      services: {
        total: Number(servicesResult.rows[0]?.total_services ?? 0),
        active: Number(servicesResult.rows[0]?.active_services ?? 0),
        totalBandwidthMbps: Number(servicesResult.rows[0]?.total_bandwidth_mbps ?? 0)
      },
      tickets: {
        open: Number(ticketResult.rows[0]?.open_tickets ?? 0),
        breached: Number(ticketResult.rows[0]?.breached_tickets ?? 0)
      },
      feasibility: {
        open: Number(feasibilityResult.rows[0]?.open_feasibility ?? 0)
      }
    };
  });

  app.get("/customers/:id/heatmap", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    if (user.customerId && user.customerId !== params.id) {
      return reply.code(403).send({ message: "Forbidden" });
    }
    const scopedSiteIds = await resolveScopedSiteIds(user, params.id);

    const result = await query<{
      site_id: string; site_name: string; city: string | null; state: string | null;
      latitude: string | null; longitude: string | null; status: string;
      service_count: string; total_bandwidth_mbps: string; active_alert_count: string;
      latest_latency_ms: string | null; latest_packet_loss_pct: string | null;
    }>(
      process.env.DATABASE_URL!,
      `
        WITH latest_metrics AS (
          SELECT DISTINCT ON (stm.site_id)
            stm.site_id, stm.latency_ms, stm.packet_loss_pct
          FROM site_traffic_metrics stm
          ORDER BY stm.site_id, stm.metric_time DESC
        )
        SELECT
          s.id AS site_id, s.name AS site_name, s.city, s.state,
          s.latitude::text, s.longitude::text, s.status,
          COUNT(DISTINCT sv.id)::text AS service_count,
          COALESCE(SUM(sv.bandwidth_mbps), 0)::text AS total_bandwidth_mbps,
          COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'OPEN')::text AS active_alert_count,
          lm.latency_ms::text AS latest_latency_ms,
          lm.packet_loss_pct::text AS latest_packet_loss_pct
        FROM sites s
        LEFT JOIN services sv ON sv.site_id = s.id
        LEFT JOIN alerts a ON a.site_id = s.id
        LEFT JOIN latest_metrics lm ON lm.site_id = s.id
        WHERE s.customer_id = $1
          ${scopedSiteIds ? "AND s.id = ANY($2::uuid[])" : ""}
        GROUP BY s.id, lm.latency_ms, lm.packet_loss_pct
        ORDER BY s.name
      `,
      scopedSiteIds ? [params.id, scopedSiteIds] : [params.id]
    );

    return result.rows.map((row) => ({
      siteId: row.site_id, siteName: row.site_name, city: row.city, state: row.state,
      latitude: row.latitude ? Number(row.latitude) : null,
      longitude: row.longitude ? Number(row.longitude) : null,
      status: row.status,
      serviceCount: Number(row.service_count ?? 0),
      totalBandwidthMbps: Number(row.total_bandwidth_mbps ?? 0),
      activeAlertCount: Number(row.active_alert_count ?? 0),
      latestLatencyMs: row.latest_latency_ms ? Number(row.latest_latency_ms) : null,
      latestPacketLossPct: row.latest_packet_loss_pct ? Number(row.latest_packet_loss_pct) : null
    }));
  });

  app.get("/customers/:id/services", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    if (user.customerId && user.customerId !== params.id) {
      return reply.code(403).send({ message: "Forbidden" });
    }
    const scopedSiteIds = await resolveScopedSiteIds(user, params.id);

    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT sv.*, s.name AS site_name, s.city, s.state
        FROM services sv
        JOIN sites s ON s.id = sv.site_id
        WHERE sv.customer_id = $1
          ${scopedSiteIds ? "AND sv.site_id = ANY($2::uuid[])" : ""}
        ORDER BY s.name, sv.service_id
      `,
      scopedSiteIds ? [params.id, scopedSiteIds] : [params.id]
    );

    return result.rows;
  });

  app.get("/customers/:id/contacts", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    if (user.customerId && user.customerId !== params.id) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const result = await query(
      process.env.DATABASE_URL!,
      `SELECT * FROM customer_contacts WHERE customer_id = $1 ORDER BY is_primary DESC, name`,
      [params.id]
    );

    return result.rows;
  });

  app.get("/customers/:id/profile", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    if (user.customerId && user.customerId !== params.id) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const result = await query<{
      id: string;
      name: string;
      code: string;
      status: string;
      tier: string;
      sla_profile: string;
      account_manager: string;
      industry: string | null;
      billing_email: string | null;
      primary_contact_name: string | null;
      primary_contact_phone: string | null;
      contract_start_date: string | null;
      contract_end_date: string | null;
      monthly_recurring_revenue: string;
      annual_contract_value: string;
    }>(
      process.env.DATABASE_URL!,
      `
        SELECT
          id,
          name,
          code,
          status,
          tier,
          sla_profile,
          account_manager,
          industry,
          billing_email,
          primary_contact_name,
          primary_contact_phone,
          contract_start_date::text,
          contract_end_date::text,
          monthly_recurring_revenue::text,
          annual_contract_value::text
        FROM customers
        WHERE id = $1
      `,
      [params.id]
    );

    if (!result.rows[0]) {
      return reply.code(404).send({ message: "Customer not found" });
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      status: row.status,
      tier: row.tier,
      slaProfile: row.sla_profile,
      accountManager: row.account_manager,
      industry: row.industry,
      billingEmail: row.billing_email,
      primaryContactName: row.primary_contact_name,
      primaryContactPhone: row.primary_contact_phone,
      contractStartDate: row.contract_start_date,
      contractEndDate: row.contract_end_date,
      monthlyRecurringRevenue: Number(row.monthly_recurring_revenue ?? 0),
      annualContractValue: Number(row.annual_contract_value ?? 0)
    };
  });

  app.patch("/customers/:id/profile", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    if (!canManageCustomerWorkspace(user, params.id)) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const body = request.body as {
      name?: string;
      industry?: string;
      billingEmail?: string;
      primaryContactName?: string;
      primaryContactPhone?: string;
    };

    const updated = await query(
      process.env.DATABASE_URL!,
      `
        UPDATE customers
        SET
          name = COALESCE($2, name),
          industry = COALESCE($3, industry),
          billing_email = COALESCE($4, billing_email),
          primary_contact_name = COALESCE($5, primary_contact_name),
          primary_contact_phone = COALESCE($6, primary_contact_phone),
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          name,
          code,
          status,
          tier,
          sla_profile,
          account_manager,
          industry,
          billing_email,
          primary_contact_name,
          primary_contact_phone,
          contract_start_date::text,
          contract_end_date::text,
          monthly_recurring_revenue::text,
          annual_contract_value::text
      `,
      [
        params.id,
        body.name?.trim() || null,
        body.industry?.trim() || null,
        body.billingEmail?.trim() || null,
        body.primaryContactName?.trim() || null,
        body.primaryContactPhone?.trim() || null,
      ]
    );

    if (!updated.rows[0]) {
      return reply.code(404).send({ message: "Customer not found" });
    }

    const row = updated.rows[0] as any;
    await writeAuditLog(user.userId, "customer", params.id, "profile.updated", {
      name: row.name,
      billingEmail: row.billing_email
    });
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      status: row.status,
      tier: row.tier,
      slaProfile: row.sla_profile,
      accountManager: row.account_manager,
      industry: row.industry,
      billingEmail: row.billing_email,
      primaryContactName: row.primary_contact_name,
      primaryContactPhone: row.primary_contact_phone,
      contractStartDate: row.contract_start_date,
      contractEndDate: row.contract_end_date,
      monthlyRecurringRevenue: Number(row.monthly_recurring_revenue ?? 0),
      annualContractValue: Number(row.annual_contract_value ?? 0)
    };
  });

  app.put("/customers/:id/contacts", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    if (!canManageCustomerWorkspace(user, params.id)) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const body = request.body as {
      contacts?: Array<{
        id?: string;
        name?: string;
        email?: string;
        phone?: string;
        role?: string;
        designation?: string;
        isPrimary?: boolean;
        contactType?: string;
      }>;
    };

    const contacts = (body.contacts ?? []).filter((item) => item.name?.trim());
    await query(process.env.DATABASE_URL!, `DELETE FROM customer_contacts WHERE customer_id = $1`, [params.id]);

    for (const contact of contacts) {
      await query(
        process.env.DATABASE_URL!,
        `
          INSERT INTO customer_contacts (
            customer_id,
            name,
            email,
            phone,
            role,
            designation,
            is_primary,
            contact_type
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          params.id,
          contact.name?.trim(),
          contact.email?.trim() || null,
          contact.phone?.trim() || null,
          contact.role?.trim() || null,
          contact.designation?.trim() || null,
          contact.isPrimary ?? false,
          contact.contactType?.trim() || null,
        ]
      );
    }

    const refreshed = await query(
      process.env.DATABASE_URL!,
      `SELECT * FROM customer_contacts WHERE customer_id = $1 ORDER BY is_primary DESC, name`,
      [params.id]
    );

    await writeAuditLog(user.userId, "customer", params.id, "contacts.updated", {
      contactCount: contacts.length
    });

    return refreshed.rows;
  });

  app.get("/customers/:id/audit-logs", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    if (user.customerId && user.customerId !== params.id) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const result = await query<{
      id: string;
      action: string;
      entity_type: string;
      entity_id: string;
      created_at: string;
      actor_name: string | null;
      actor_email: string | null;
      details: Record<string, unknown> | null;
    }>(
      process.env.DATABASE_URL!,
      `
        SELECT
          al.id::text AS id,
          al.action,
          al.entity_type,
          al.entity_id,
          al.created_at::text,
          u.full_name AS actor_name,
          u.email AS actor_email,
          al.details
        FROM audit_logs al
        LEFT JOIN users u ON u.id = al.actor_user_id
        WHERE (al.entity_type = 'customer' AND al.entity_id = $1)
           OR (al.entity_type = 'customer_user' AND al.details ->> 'customerId' = $1)
        ORDER BY al.created_at DESC
        LIMIT 30
      `,
      [params.id]
    );

    return result.rows.map((row) => ({
      id: Number(row.id),
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      createdAt: row.created_at,
      actorName: row.actor_name,
      actorEmail: row.actor_email,
      details: row.details ?? {},
    }));
  });

  app.get("/customers/:id/documents", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    if (user.customerId && user.customerId !== params.id) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const scopedSiteIds = await resolveScopedSiteIds(user, params.id);
    const result = await query<{
      id: string;
      title: string;
      category: string;
      status: string;
      file_url: string | null;
      notes: string | null;
      linked_site_id: string | null;
      linked_site_name: string | null;
      created_at: string;
      updated_at: string;
    }>(
      process.env.DATABASE_URL!,
      `
        SELECT
          cd.id,
          cd.title,
          cd.category,
          cd.status,
          cd.file_url,
          cd.notes,
          cd.linked_site_id,
          s.name AS linked_site_name,
          cd.created_at::text,
          cd.updated_at::text
        FROM customer_documents cd
        LEFT JOIN sites s ON s.id = cd.linked_site_id
        WHERE cd.customer_id = $1
          ${scopedSiteIds ? "AND (cd.linked_site_id IS NULL OR cd.linked_site_id = ANY($2::uuid[]))" : ""}
        ORDER BY cd.created_at DESC
      `,
      scopedSiteIds ? [params.id, scopedSiteIds] : [params.id]
    );

    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      status: row.status,
      fileUrl: row.file_url,
      notes: row.notes,
      linkedSiteId: row.linked_site_id,
      linkedSiteName: row.linked_site_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  });

  app.post("/customers/:id/documents", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    if (!canManageCustomerWorkspace(user, params.id)) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const body = request.body as {
      title?: string;
      category?: string;
      fileUrl?: string;
      notes?: string;
      linkedSiteId?: string;
      status?: string;
    };

    if (!body.title || !body.category) {
      return reply.code(400).send({ message: "title and category are required" });
    }

    const inserted = await query<{
      id: string;
      title: string;
      category: string;
      status: string;
      file_url: string | null;
      notes: string | null;
      linked_site_id: string | null;
      linked_site_name: string | null;
      created_at: string;
      updated_at: string;
    }>(
      process.env.DATABASE_URL!,
      `
        INSERT INTO customer_documents (
          customer_id,
          uploaded_by_user_id,
          linked_site_id,
          title,
          category,
          status,
          file_url,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'ACTIVE'), $7, $8)
        RETURNING
          id,
          title,
          category,
          status,
          file_url,
          notes,
          linked_site_id,
          created_at::text,
          updated_at::text
      `,
      [
        params.id,
        user.userId,
        body.linkedSiteId ?? null,
        body.title.trim(),
        body.category.trim(),
        body.status?.trim() || null,
        body.fileUrl?.trim() || null,
        body.notes?.trim() || null,
      ]
    );

    await writeAuditLog(user.userId, "customer", params.id, "document.created", {
      title: body.title.trim(),
      category: body.category.trim(),
      linkedSiteId: body.linkedSiteId ?? null
    });

    reply.code(201);
    const row = inserted.rows[0];
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      status: row.status,
      fileUrl: row.file_url,
      notes: row.notes,
      linkedSiteId: row.linked_site_id,
      linkedSiteName: row.linked_site_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

  app.get("/customers/:id/requests", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    if (user.customerId && user.customerId !== params.id) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const result = await query<{
      id: string;
      request_code: string;
      request_type: string;
      status: string;
      priority: string;
      title: string;
      description: string;
      service_id: string | null;
      service_name: string | null;
      site_id: string | null;
      site_name: string | null;
      requested_by_name: string | null;
      created_at: string;
      updated_at: string;
      target_value: string | null;
      metadata: Record<string, unknown> | null;
    }>(
      process.env.DATABASE_URL!,
      `
        SELECT
          csr.id,
          csr.request_code,
          csr.request_type,
          csr.status,
          csr.priority,
          csr.title,
          csr.description,
          csr.service_id,
          sv.service_id AS service_name,
          csr.site_id,
          s.name AS site_name,
          u.full_name AS requested_by_name,
          csr.created_at::text,
          csr.updated_at::text,
          csr.target_value,
          csr.metadata
        FROM customer_service_requests csr
        LEFT JOIN services sv ON sv.id = csr.service_id
        LEFT JOIN sites s ON s.id = csr.site_id
        LEFT JOIN users u ON u.id = csr.requested_by_user_id
        WHERE csr.customer_id = $1
        ORDER BY csr.created_at DESC
      `,
      [params.id]
    );

    return result.rows.map((row) => ({
      id: row.id,
      requestCode: row.request_code,
      requestType: row.request_type,
      status: row.status,
      priority: row.priority,
      title: row.title,
      description: row.description,
      serviceId: row.service_id,
      serviceName: row.service_name,
      siteId: row.site_id,
      siteName: row.site_name,
      requestedByName: row.requested_by_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      targetValue: row.target_value,
      metadata: row.metadata ?? {},
    }));
  });

  app.post("/customers/:id/requests", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    if (user.customerId && user.customerId !== params.id) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const body = request.body as {
      requestType?: string;
      priority?: string;
      title?: string;
      description?: string;
      serviceId?: string;
      siteId?: string;
      targetValue?: string;
    };

    if (!body.requestType || !body.title || !body.description) {
      return reply.code(400).send({ message: "requestType, title, and description are required" });
    }

    const inserted = await query(
      process.env.DATABASE_URL!,
      `
        INSERT INTO customer_service_requests (
          customer_id,
          requested_by_user_id,
          request_code,
          request_type,
          priority,
          title,
          description,
          service_id,
          site_id,
          target_value,
          status,
          metadata
        )
        VALUES (
          $1,
          $2,
          CONCAT('CSR-', TO_CHAR(NOW(), 'YYMMDD'), '-', LPAD((FLOOR(RANDOM() * 9000) + 1000)::text, 4, '0')),
          $3,
          COALESCE($4, 'MEDIUM'),
          $5,
          $6,
          $7,
          $8,
          $9,
          'REQUESTED',
          '{}'::jsonb
        )
        RETURNING id
      `,
      [params.id, user.userId, body.requestType, body.priority ?? "MEDIUM", body.title.trim(), body.description.trim(), body.serviceId ?? null, body.siteId ?? null, body.targetValue ?? null]
    );

    await writeAuditLog(user.userId, "customer", params.id, "request.created", {
      requestType: body.requestType,
      title: body.title.trim(),
      siteId: body.siteId ?? null,
      serviceId: body.serviceId ?? null
    });

    reply.code(201);

    const created = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          csr.id,
          csr.request_code,
          csr.request_type,
          csr.status,
          csr.priority,
          csr.title,
          csr.description,
          csr.service_id,
          sv.service_id AS service_name,
          csr.site_id,
          s.name AS site_name,
          u.full_name AS requested_by_name,
          csr.created_at::text,
          csr.updated_at::text,
          csr.target_value,
          csr.metadata
        FROM customer_service_requests csr
        LEFT JOIN services sv ON sv.id = csr.service_id
        LEFT JOIN sites s ON s.id = csr.site_id
        LEFT JOIN users u ON u.id = csr.requested_by_user_id
        WHERE csr.id = $1
      `,
      [inserted.rows[0]?.id]
    );

    const row = created.rows[0] as any;
    return {
      id: row.id,
      requestCode: row.request_code,
      requestType: row.request_type,
      status: row.status,
      priority: row.priority,
      title: row.title,
      description: row.description,
      serviceId: row.service_id,
      serviceName: row.service_name,
      siteId: row.site_id,
      siteName: row.site_name,
      requestedByName: row.requested_by_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      targetValue: row.target_value,
      metadata: row.metadata ?? {},
    };
  });

  app.get("/customers/:id/portal-users", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    if (user.customerId && user.customerId !== params.id) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const result = await query<{
      id: string;
      email: string;
      full_name: string;
      is_active: boolean;
      roles: string[];
      assigned_sites: string;
      access_levels: string[];
      scope_mode: string;
      site_names: string[];
      created_at: string;
    }>(
      process.env.DATABASE_URL!,
      `
        SELECT
          u.id,
          u.email,
          u.full_name,
          u.is_active,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT r.name), NULL) AS roles,
          COUNT(DISTINCT cusa.site_id)::text AS assigned_sites,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT cusa.access_level), NULL) AS access_levels,
          CASE
            WHEN COUNT(DISTINCT cusa.site_id) = 0 THEN 'ALL_SITES'
            ELSE 'SELECTED_SITES'
          END AS scope_mode,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT s.name), NULL) AS site_names,
          u.created_at::text AS created_at
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        LEFT JOIN customer_user_site_access cusa ON cusa.user_id = u.id
        LEFT JOIN sites s ON s.id = cusa.site_id
        WHERE u.customer_id = $1
        GROUP BY u.id
        ORDER BY
          CASE WHEN ARRAY_REMOVE(ARRAY_AGG(DISTINCT r.name), NULL) @> ARRAY['ENTERPRISE_ADMIN']::varchar[] THEN 0 ELSE 1 END,
          u.full_name
      `,
      [params.id]
    );

    return result.rows.map((row) => {
      const roles = row.roles ?? [];
      const accessLevels = row.access_levels ?? [];
      const siteNames = row.site_names ?? [];
      let accessProfile = "Customer User";
      if (roles.includes("ENTERPRISE_ADMIN")) accessProfile = "Customer Admin";
      else if (accessLevels.includes("FINANCE")) accessProfile = "Finance User";
      else if (row.scope_mode === "SELECTED_SITES" && Number(row.assigned_sites) <= 2) accessProfile = "Branch Manager";
      else if (accessLevels.includes("OPERATIONS")) accessProfile = "Operations User";

      return {
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        isActive: row.is_active,
        roles,
        accessLevels,
        scopeMode: row.scope_mode,
        assignedSites: Number(row.assigned_sites ?? 0),
        siteNames,
        accessProfile,
        createdAt: row.created_at
      };
    });
  });

  app.post("/customers/:id/portal-users", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    if (!canManageCustomerWorkspace(user, params.id)) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const body = request.body as {
      email?: string;
      fullName?: string;
      password?: string;
      role?: "ENTERPRISE_ADMIN" | "ENTERPRISE_USER";
      scopeMode?: "ALL_SITES" | "SELECTED_SITES";
      accessLevels?: string[];
      siteIds?: string[];
      isActive?: boolean;
    };

    if (!body.email || !body.fullName || !body.password || !body.role) {
      return reply.code(400).send({ message: "email, fullName, password, and role are required" });
    }

    const normalizedEmail = body.email.trim().toLowerCase();
    const accessLevels = Array.from(new Set((body.accessLevels ?? []).filter(Boolean)));
    const siteIds = Array.from(new Set((body.siteIds ?? []).filter(Boolean)));
    const scopeMode = body.scopeMode ?? "ALL_SITES";

    const existing = await query<{ id: string }>(
      process.env.DATABASE_URL!,
      `SELECT id FROM users WHERE email = $1`,
      [normalizedEmail]
    );

    if (existing.rows[0]) {
      return reply.code(409).send({ message: "A user with this email already exists" });
    }

    const customer = await query<{ id: string }>(
      process.env.DATABASE_URL!,
      `SELECT id FROM customers WHERE id = $1`,
      [params.id]
    );

    if (!customer.rows[0]) {
      return reply.code(404).send({ message: "Customer not found" });
    }

    const inserted = await query<{ id: string }>(
      process.env.DATABASE_URL!,
      `
        INSERT INTO users (customer_id, email, full_name, password_hash, is_active)
        VALUES ($1, $2, $3, crypt($4, gen_salt('bf')), $5)
        RETURNING id
      `,
      [params.id, normalizedEmail, body.fullName.trim(), body.password, body.isActive ?? true]
    );

    const createdUserId = inserted.rows[0]?.id;
    if (!createdUserId) {
      return reply.code(500).send({ message: "Failed to create portal user" });
    }

    await query(
      process.env.DATABASE_URL!,
      `
        INSERT INTO user_roles (user_id, role_id)
        SELECT $1, id
        FROM roles
        WHERE name = $2
        ON CONFLICT DO NOTHING
      `,
      [createdUserId, body.role]
    );

    if (scopeMode === "SELECTED_SITES" && siteIds.length > 0) {
      await query(
        process.env.DATABASE_URL!,
        `
          INSERT INTO customer_user_site_access (user_id, site_id, access_level)
          SELECT $1, s.id, $3
          FROM unnest($2::uuid[]) AS scoped(site_id)
          JOIN sites s ON s.id = scoped.site_id AND s.customer_id = $4
          ON CONFLICT (user_id, site_id) DO UPDATE SET access_level = EXCLUDED.access_level
        `,
        [createdUserId, siteIds, accessLevels[0] ?? "OPERATIONS", params.id]
      );
    }

    await writeAuditLog(user.userId, "customer_user", createdUserId, "portal-user.created", {
      customerId: params.id,
      role: body.role,
      scopeMode,
      accessLevels
    });

    reply.code(201);
    const createdUser = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          u.id,
          u.email,
          u.full_name,
          u.is_active,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT r.name), NULL) AS roles,
          COUNT(DISTINCT cusa.site_id)::text AS assigned_sites,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT cusa.access_level), NULL) AS access_levels,
          CASE WHEN COUNT(DISTINCT cusa.site_id) = 0 THEN 'ALL_SITES' ELSE 'SELECTED_SITES' END AS scope_mode,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT s.name), NULL) AS site_names,
          u.created_at::text AS created_at
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        LEFT JOIN customer_user_site_access cusa ON cusa.user_id = u.id
        LEFT JOIN sites s ON s.id = cusa.site_id
        WHERE u.id = $1
        GROUP BY u.id
      `,
      [createdUserId]
    );

    const row = createdUser.rows[0] as any;
    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      isActive: row.is_active,
      roles: row.roles ?? [],
      accessLevels: row.access_levels ?? [],
      scopeMode: row.scope_mode,
      assignedSites: Number(row.assigned_sites ?? 0),
      siteNames: row.site_names ?? [],
      accessProfile: body.role === "ENTERPRISE_ADMIN" ? "Customer Admin" : (accessLevels[0] ?? "Customer User"),
      createdAt: row.created_at
    };
  });

  app.patch("/customers/:id/portal-users/:userId", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string; userId: string };
    const user = request.auth!;
    if (!canManageCustomerWorkspace(user, params.id)) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const body = request.body as {
      fullName?: string;
      role?: "ENTERPRISE_ADMIN" | "ENTERPRISE_USER";
      scopeMode?: "ALL_SITES" | "SELECTED_SITES";
      accessLevels?: string[];
      siteIds?: string[];
      isActive?: boolean;
    };

    const targetUser = await query<{ id: string; customer_id: string | null }>(
      process.env.DATABASE_URL!,
      `SELECT id, customer_id FROM users WHERE id = $1`,
      [params.userId]
    );

    if (!targetUser.rows[0] || targetUser.rows[0].customer_id !== params.id) {
      return reply.code(404).send({ message: "Portal user not found" });
    }

    await query(
      process.env.DATABASE_URL!,
      `
        UPDATE users
        SET
          full_name = COALESCE($2, full_name),
          is_active = COALESCE($3, is_active),
          updated_at = NOW()
        WHERE id = $1
      `,
      [params.userId, body.fullName?.trim() || null, typeof body.isActive === "boolean" ? body.isActive : null]
    );

    if (body.role) {
      await query(
        process.env.DATABASE_URL!,
        `
          DELETE FROM user_roles
          WHERE user_id = $1
            AND role_id IN (
              SELECT id FROM roles WHERE name IN ('ENTERPRISE_ADMIN', 'ENTERPRISE_USER')
            )
        `,
        [params.userId]
      );

      await query(
        process.env.DATABASE_URL!,
        `
          INSERT INTO user_roles (user_id, role_id)
          SELECT $1, id
          FROM roles
          WHERE name = $2
          ON CONFLICT DO NOTHING
        `,
        [params.userId, body.role]
      );
    }

    if (body.scopeMode === "ALL_SITES") {
      await query(
        process.env.DATABASE_URL!,
        `DELETE FROM customer_user_site_access WHERE user_id = $1`,
        [params.userId]
      );
    } else if (body.scopeMode === "SELECTED_SITES") {
      const siteIds = Array.from(new Set((body.siteIds ?? []).filter(Boolean)));
      await query(
        process.env.DATABASE_URL!,
        `DELETE FROM customer_user_site_access WHERE user_id = $1`,
        [params.userId]
      );

      if (siteIds.length > 0) {
        await query(
          process.env.DATABASE_URL!,
          `
            INSERT INTO customer_user_site_access (user_id, site_id, access_level)
            SELECT $1, s.id, $3
            FROM unnest($2::uuid[]) AS scoped(site_id)
            JOIN sites s ON s.id = scoped.site_id AND s.customer_id = $4
            ON CONFLICT (user_id, site_id) DO UPDATE SET access_level = EXCLUDED.access_level
          `,
          [params.userId, siteIds, body.accessLevels?.[0] ?? "OPERATIONS", params.id]
        );
      }
    }

    await writeAuditLog(user.userId, "customer_user", params.userId, "portal-user.updated", {
      customerId: params.id,
      role: body.role,
      scopeMode: body.scopeMode,
      accessLevels: body.accessLevels ?? [],
      isActive: body.isActive
    });

    const updatedUser = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          u.id,
          u.email,
          u.full_name,
          u.is_active,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT r.name), NULL) AS roles,
          COUNT(DISTINCT cusa.site_id)::text AS assigned_sites,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT cusa.access_level), NULL) AS access_levels,
          CASE WHEN COUNT(DISTINCT cusa.site_id) = 0 THEN 'ALL_SITES' ELSE 'SELECTED_SITES' END AS scope_mode,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT s.name), NULL) AS site_names,
          u.created_at::text AS created_at
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        LEFT JOIN customer_user_site_access cusa ON cusa.user_id = u.id
        LEFT JOIN sites s ON s.id = cusa.site_id
        WHERE u.id = $1
        GROUP BY u.id
      `,
      [params.userId]
    );

    const row = updatedUser.rows[0] as any;
    const roles = row.roles ?? [];
    const accessLevels = row.access_levels ?? [];
    let accessProfile = "Customer User";
    if (roles.includes("ENTERPRISE_ADMIN")) accessProfile = "Customer Admin";
    else if (accessLevels.includes("FINANCE")) accessProfile = "Finance User";
    else if (row.scope_mode === "SELECTED_SITES" && Number(row.assigned_sites) <= 2) accessProfile = "Branch Manager";
    else if (accessLevels.includes("OPERATIONS")) accessProfile = "Operations User";

    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      isActive: row.is_active,
      roles,
      accessLevels,
      scopeMode: row.scope_mode,
      assignedSites: Number(row.assigned_sites ?? 0),
      siteNames: row.site_names ?? [],
      accessProfile,
      createdAt: row.created_at
    };
  });

  app.post("/customers/:id/portal-users/:userId/reset-password", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string; userId: string };
    const user = request.auth!;
    if (!canManageCustomerWorkspace(user, params.id)) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const body = request.body as { password?: string };
    if (!body.password || body.password.trim().length < 8) {
      return reply.code(400).send({ message: "A password of at least 8 characters is required" });
    }

    const updated = await query(
      process.env.DATABASE_URL!,
      `
        UPDATE users
        SET password_hash = crypt($2, gen_salt('bf')), updated_at = NOW()
        WHERE id = $1
          AND customer_id = $3
        RETURNING id, email
      `,
      [params.userId, body.password.trim(), params.id]
    );

    if (!updated.rows[0]) {
      return reply.code(404).send({ message: "Portal user not found" });
    }

    await writeAuditLog(user.userId, "customer_user", params.userId, "portal-user.password-reset", {
      customerId: params.id,
      email: updated.rows[0].email
    });

    return { success: true, userId: params.userId };
  });

  app.get("/customers/:id/site-groups", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    if (user.customerId && user.customerId !== params.id) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const manualGroups = await query<{
      id: string;
      name: string;
      description: string | null;
      group_type: string;
      member_count: string;
      site_names: string[];
    }>(
      process.env.DATABASE_URL!,
      `
        SELECT
          csg.id,
          csg.name,
          csg.description,
          csg.group_type,
          COUNT(csgm.site_id)::text AS member_count,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT s.name), NULL) AS site_names
        FROM customer_site_groups csg
        LEFT JOIN customer_site_group_members csgm ON csgm.group_id = csg.id
        LEFT JOIN sites s ON s.id = csgm.site_id
        WHERE csg.customer_id = $1
        GROUP BY csg.id
        ORDER BY csg.name
      `,
      [params.id]
    );

    const cityGroups = await query<{
      city: string | null;
      member_count: string;
      site_names: string[];
    }>(
      process.env.DATABASE_URL!,
      `
        SELECT
          city,
          COUNT(*)::text AS member_count,
          ARRAY_REMOVE(ARRAY_AGG(name), NULL) AS site_names
        FROM sites
        WHERE customer_id = $1
        GROUP BY city
        ORDER BY city
      `,
      [params.id]
    );

    return [
      ...manualGroups.rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        groupType: row.group_type,
        memberCount: Number(row.member_count ?? 0),
        siteNames: row.site_names ?? []
      })),
      ...cityGroups.rows
        .filter((row) => row.city)
        .map((row) => ({
          id: `city-${row.city}`,
          name: `${row.city} Sites`,
          description: "Auto-grouped by city for customer operations",
          groupType: "AUTO_CITY",
          memberCount: Number(row.member_count ?? 0),
          siteNames: row.site_names ?? []
        }))
    ];
  });

  app.get("/customers/:id/site-access", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    if (user.customerId && user.customerId !== params.id) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const result = await query<{
      site_id: string;
      site_name: string;
      city: string | null;
      status: string;
      user_id: string | null;
      full_name: string | null;
      email: string | null;
      access_level: string | null;
    }>(
      process.env.DATABASE_URL!,
      `
        SELECT
          s.id AS site_id,
          s.name AS site_name,
          s.city,
          s.status,
          u.id AS user_id,
          u.full_name,
          u.email,
          cusa.access_level
        FROM sites s
        LEFT JOIN customer_user_site_access cusa ON cusa.site_id = s.id
        LEFT JOIN users u ON u.id = cusa.user_id
        WHERE s.customer_id = $1
        ORDER BY s.name, u.full_name NULLS LAST
      `,
      [params.id]
    );

    const grouped = new Map<string, {
      siteId: string;
      siteName: string;
      city: string | null;
      status: string;
      assignments: Array<{ userId: string; fullName: string; email: string; accessLevel: string }>;
    }>();

    for (const row of result.rows) {
      if (!grouped.has(row.site_id)) {
        grouped.set(row.site_id, {
          siteId: row.site_id,
          siteName: row.site_name,
          city: row.city,
          status: row.status,
          assignments: []
        });
      }

      if (row.user_id && row.full_name && row.email && row.access_level) {
        grouped.get(row.site_id)!.assignments.push({
          userId: row.user_id,
          fullName: row.full_name,
          email: row.email,
          accessLevel: row.access_level
        });
      }
    }

    return Array.from(grouped.values());
  });

  app.get("/customers/:id/sla", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const result = await query(
      process.env.DATABASE_URL!,
      `SELECT id, name, sla_profile, sla_uptime_target, sla_response_minutes, sla_resolution_minutes
       FROM customers WHERE id = $1`,
      [params.id]
    );

    if (!result.rows[0]) {
      return reply.code(404).send({ message: "Customer not found" });
    }

    return result.rows[0];
  });

  app.get("/customers/:id/sla-report", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    if (user.customerId && user.customerId !== params.id) {
      return reply.code(403).send({ message: "Forbidden" });
    }
    const scopedSiteIds = await resolveScopedSiteIds(user, params.id);

    const queryParams = request.query as { month?: string };
    const selectedMonth = queryParams.month ?? new Date().toISOString().slice(0, 7);

    const [customerResult, siteBreakdownResult, incidentResult, trafficResult] = await Promise.all([
      query<{
        sla_uptime_target: string;
        sla_response_minutes: string;
        sla_resolution_minutes: string;
      }>(
        process.env.DATABASE_URL!,
        `
          SELECT sla_uptime_target::text, sla_response_minutes::text, sla_resolution_minutes::text
          FROM customers
          WHERE id = $1
        `,
        scopedSiteIds ? [params.id, scopedSiteIds] : [params.id]
      ),
      query<{
        site_id: string;
        site_name: string;
        city: string | null;
        status: string;
        service_count: string;
        total_bandwidth_mbps: string;
        open_incidents: string;
        latency_ms: string | null;
        packet_loss_pct: string | null;
        uptime_percent: string;
        downtime_minutes: string;
      }>(
        process.env.DATABASE_URL!,
        `
          WITH latest_metrics AS (
            SELECT DISTINCT ON (stm.site_id)
              stm.site_id,
              stm.latency_ms,
              stm.packet_loss_pct
            FROM site_traffic_metrics stm
            ORDER BY stm.site_id, stm.metric_time DESC
          ),
          ticket_counts AS (
            SELECT
              t.site_id,
              COUNT(*) FILTER (WHERE t.status IN ('OPEN', 'IN_PROGRESS'))::int AS open_incidents
            FROM tickets t
            WHERE t.customer_id = $1
              ${scopedSiteIds ? "AND (t.site_id IS NULL OR t.site_id = ANY($2::uuid[]))" : ""}
            GROUP BY t.site_id
          )
          SELECT
            s.id AS site_id,
            s.name AS site_name,
            s.city,
            s.status,
            COUNT(DISTINCT sv.id)::text AS service_count,
            COALESCE(SUM(sv.bandwidth_mbps), 0)::text AS total_bandwidth_mbps,
            COALESCE(tc.open_incidents, 0)::text AS open_incidents,
            lm.latency_ms::text AS latency_ms,
            lm.packet_loss_pct::text AS packet_loss_pct,
            CASE
              WHEN s.status = 'DOWN' THEN '97.400'
              WHEN s.status = 'DEGRADED' THEN '99.120'
              ELSE '99.960'
            END AS uptime_percent,
            CASE
              WHEN s.status = 'DOWN' THEN '112'
              WHEN s.status = 'DEGRADED' THEN '38'
              ELSE '6'
            END AS downtime_minutes
          FROM sites s
          LEFT JOIN services sv ON sv.site_id = s.id
          LEFT JOIN latest_metrics lm ON lm.site_id = s.id
          LEFT JOIN ticket_counts tc ON tc.site_id = s.id
          WHERE s.customer_id = $1
            ${scopedSiteIds ? "AND s.id = ANY($2::uuid[])" : ""}
          GROUP BY s.id, tc.open_incidents, lm.latency_ms, lm.packet_loss_pct
          ORDER BY s.name
        `,
        scopedSiteIds ? [params.id, scopedSiteIds] : [params.id]
      ),
      query<{
        open_incidents: string;
        resolved_this_month: string;
        breached_tickets: string;
      }>(
        process.env.DATABASE_URL!,
        `
          SELECT
            COUNT(*) FILTER (WHERE status IN ('OPEN', 'IN_PROGRESS'))::text AS open_incidents,
            COUNT(*) FILTER (
              WHERE resolved_at IS NOT NULL
                AND TO_CHAR(resolved_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM') = $2
            )::text AS resolved_this_month,
            COUNT(*) FILTER (
              WHERE status IN ('OPEN', 'IN_PROGRESS')
                AND resolution_due_at IS NOT NULL
                AND resolution_due_at <= NOW()
            )::text AS breached_tickets
          FROM tickets
          WHERE customer_id = $1
            ${scopedSiteIds ? "AND (site_id IS NULL OR site_id = ANY($3::uuid[]))" : ""}
        `,
        scopedSiteIds ? [params.id, selectedMonth, scopedSiteIds] : [params.id, selectedMonth]
      ),
      query<{
        avg_latency_ms: string | null;
        avg_packet_loss_pct: string | null;
        peak_inbound_bps: string | null;
        peak_outbound_bps: string | null;
      }>(
        process.env.DATABASE_URL!,
        `
          SELECT
            AVG(stm.latency_ms)::text AS avg_latency_ms,
            AVG(stm.packet_loss_pct)::text AS avg_packet_loss_pct,
            MAX(stm.inbound_bps)::text AS peak_inbound_bps,
            MAX(stm.outbound_bps)::text AS peak_outbound_bps
          FROM site_traffic_metrics stm
          JOIN sites s ON s.id = stm.site_id
          WHERE s.customer_id = $1
            ${scopedSiteIds ? "AND s.id = ANY($3::uuid[])" : ""}
            AND TO_CHAR(stm.metric_time AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM') = $2
        `,
        scopedSiteIds ? [params.id, selectedMonth, scopedSiteIds] : [params.id, selectedMonth]
      )
    ]);

    if (!customerResult.rows[0]) {
      return reply.code(404).send({ message: "Customer not found" });
    }

    const contractedSla = Number(customerResult.rows[0]?.sla_uptime_target ?? 99.5);
    const siteBreakdown = siteBreakdownResult.rows.map((row) => ({
      siteId: row.site_id,
      siteName: row.site_name,
      city: row.city,
      status: row.status,
      serviceCount: Number(row.service_count ?? 0),
      totalBandwidthMbps: Number(row.total_bandwidth_mbps ?? 0),
      openIncidents: Number(row.open_incidents ?? 0),
      latencyMs: row.latency_ms ? Number(row.latency_ms) : null,
      packetLossPct: row.packet_loss_pct ? Number(row.packet_loss_pct) : null,
      uptimePercent: Number(row.uptime_percent ?? 0),
      downtimeMinutes: Number(row.downtime_minutes ?? 0),
    }));

    const currentUptime =
      siteBreakdown.length > 0
        ? Number(
            (
              siteBreakdown.reduce((sum, site) => sum + site.uptimePercent, 0) / siteBreakdown.length
            ).toFixed(3)
          )
        : contractedSla;

    const totalDowntimeMinutes = siteBreakdown.reduce((sum, site) => sum + site.downtimeMinutes, 0);
    const impactedSites = siteBreakdown.filter((site) => site.status !== "UP").length;
    const creditsOwed =
      currentUptime < contractedSla
        ? Math.round((contractedSla - currentUptime) * 1000)
        : 0;

    const monthDate = new Date(`${selectedMonth}-01T00:00:00`);
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(monthDate);
      date.setMonth(date.getMonth() - index);
      const period = date.toISOString().slice(0, 7);
      const uptimePercent = Math.max(
        97,
        Number((currentUptime - index * 0.08 + (index % 2 === 0 ? 0.06 : -0.03)).toFixed(3))
      );
      const downtimeMinutes = Math.max(0, Math.round((100 - uptimePercent) * 28));
      const incidents = Math.max(0, impactedSites + index);
      const issuedCredits = uptimePercent < contractedSla ? Math.round((contractedSla - uptimePercent) * 900) : 0;

      return {
        month: period,
        uptimePercent,
        totalDowntimeMinutes: downtimeMinutes,
        incidents,
        creditsIssued: issuedCredits
      };
    }).reverse();

    return {
      summary: {
        contractedSla,
        currentUptime,
        creditsOwed,
        impactedSites,
        totalDowntimeMinutes,
        openIncidents: Number(incidentResult.rows[0]?.open_incidents ?? 0),
        resolvedThisMonth: Number(incidentResult.rows[0]?.resolved_this_month ?? 0),
        breachedTickets: Number(incidentResult.rows[0]?.breached_tickets ?? 0),
        avgLatencyMs: trafficResult.rows[0]?.avg_latency_ms ? Number(trafficResult.rows[0]?.avg_latency_ms) : 0,
        avgPacketLossPct: trafficResult.rows[0]?.avg_packet_loss_pct ? Number(trafficResult.rows[0]?.avg_packet_loss_pct) : 0,
        peakInboundMbps: trafficResult.rows[0]?.peak_inbound_bps ? Number(trafficResult.rows[0]?.peak_inbound_bps) / 1_000_000 : 0,
        peakOutboundMbps: trafficResult.rows[0]?.peak_outbound_bps ? Number(trafficResult.rows[0]?.peak_outbound_bps) / 1_000_000 : 0
      },
      months,
      siteBreakdown
    };
  });

  app.get("/customers/:id/dashboard-url", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const dashboardUid = process.env.GRAFANA_DASHBOARD_UID;
    if (!dashboardUid) {
      return reply.code(503).send({ message: "Grafana not configured" });
    }

    return { url: buildCustomerDashboardUrl(params.id, dashboardUid) };
  });

  // ─── Sites ──────────────────────────────────────────────────────────────────

  app.get("/sites", { preHandler: [requireAuth] }, async (request) => {
    const user = request.auth!;
    const scopedSiteIds = user.customerId ? await resolveScopedSiteIds(user, user.customerId) : null;
    const customerFilter = user.customerId ? "WHERE s.customer_id = $1" : "";
    const scopedFilter = scopedSiteIds ? `${customerFilter ? "AND" : "WHERE"} s.id = ANY($2::uuid[])` : "";
    const params = user.customerId ? (scopedSiteIds ? [user.customerId, scopedSiteIds] : [user.customerId]) : [];

    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          s.id, s.customer_id, s.name, s.code, s.region, s.status,
          s.address, s.city, s.state, s.ip_block, s.pop,
          s.last_mile_provider, s.go_live_date, s.contract_end_date,
          s.created_at,
          c.name AS customer_name,
          COUNT(DISTINCT d.id)::text AS device_count,
          COUNT(DISTINCT sv.id)::text AS service_count,
          COALESCE(SUM(sv.bandwidth_mbps), 0)::text AS total_bandwidth_mbps
        FROM sites s
        JOIN customers c ON c.id = s.customer_id
        LEFT JOIN devices d ON d.site_id = s.id
        LEFT JOIN services sv ON sv.site_id = s.id
        ${customerFilter}
        ${scopedFilter}
        GROUP BY s.id, c.name
        ORDER BY s.name
      `,
      params
    );

    return result.rows;
  });

  app.get("/sites/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    const scopedSiteIds = user.customerId ? await resolveScopedSiteIds(user, user.customerId) : null;
    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          s.*,
          c.name AS customer_name,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', d.id,
                'hostname', d.hostname,
                'ipAddress', d.ip_address,
                'vendor', d.vendor,
                'status', d.status
              )
            ) FILTER (WHERE d.id IS NOT NULL),
            '[]'::json
          ) AS devices
        FROM sites s
        JOIN customers c ON c.id = s.customer_id
        LEFT JOIN devices d ON d.site_id = s.id
        WHERE s.id = $1
          ${user.customerId ? "AND s.customer_id = $2" : ""}
          ${scopedSiteIds ? `AND s.id = ANY($${user.customerId ? 3 : 2}::uuid[])` : ""}
        GROUP BY s.id, c.name
      `,
      user.customerId
        ? (scopedSiteIds ? [params.id, user.customerId, scopedSiteIds] : [params.id, user.customerId])
        : [params.id]
    );

    if (!result.rows[0]) {
      return reply.code(404).send({ message: "Site not found" });
    }

    return result.rows[0];
  });

  app.get("/sites/:id/traffic", { preHandler: [requireAuth] }, async (request) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    const scopedSiteIds = user.customerId ? await resolveScopedSiteIds(user, user.customerId) : null;
    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT metric_time, inbound_bps, outbound_bps, latency_ms, packet_loss_pct
        FROM site_traffic_metrics stm
        JOIN sites s ON s.id = stm.site_id
        WHERE stm.site_id = $1
          ${user.customerId ? "AND s.customer_id = $2" : ""}
          ${scopedSiteIds ? `AND s.id = ANY($${user.customerId ? 3 : 2}::uuid[])` : ""}
        ORDER BY metric_time DESC
        LIMIT 288
      `,
      user.customerId
        ? (scopedSiteIds ? [params.id, user.customerId, scopedSiteIds] : [params.id, user.customerId])
        : [params.id]
    );

    return result.rows;
  });

  app.get("/sites/:id/services", { preHandler: [requireAuth] }, async (request) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    const scopedSiteIds = user.customerId ? await resolveScopedSiteIds(user, user.customerId) : null;
    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          id, service_id, circuit_id, service_type, bandwidth_mbps,
          pop, last_mile, ip_block, static_ip::text,
          status, activation_date, contract_end_date, contract_months,
          monthly_charge, notes, metadata
        FROM services sv
        JOIN sites s ON s.id = sv.site_id
        WHERE sv.site_id = $1
          ${user.customerId ? "AND s.customer_id = $2" : ""}
          ${scopedSiteIds ? `AND s.id = ANY($${user.customerId ? 3 : 2}::uuid[])` : ""}
        ORDER BY service_id
      `,
      user.customerId
        ? (scopedSiteIds ? [params.id, user.customerId, scopedSiteIds] : [params.id, user.customerId])
        : [params.id]
    );

    return result.rows;
  });

  app.get("/sites/:id/devices", { preHandler: [requireAuth] }, async (request) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    const scopedSiteIds = user.customerId ? await resolveScopedSiteIds(user, user.customerId) : null;
    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          id,
          hostname,
          ip_address,
          vendor,
          model,
          status,
          device_type AS type,
          last_seen_at,
          created_at
        FROM devices d
        JOIN sites s ON s.id = d.site_id
        WHERE d.site_id = $1
          ${user.customerId ? "AND s.customer_id = $2" : ""}
          ${scopedSiteIds ? `AND s.id = ANY($${user.customerId ? 3 : 2}::uuid[])` : ""}
        ORDER BY hostname
      `,
      user.customerId
        ? (scopedSiteIds ? [params.id, user.customerId, scopedSiteIds] : [params.id, user.customerId])
        : [params.id]
    );

    return result.rows;
  });

  app.get("/sites/:id/events", { preHandler: [requireAuth] }, async (request) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    const scopedSiteIds = user.customerId ? await resolveScopedSiteIds(user, user.customerId) : null;
    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          a.id,
          COALESCE(a.resolved_at, a.acknowledged_at, a.created_at)::text AS timestamp,
          CASE
            WHEN a.priority IN ('P1', 'P2') THEN 'critical'
            WHEN a.priority = 'P3' THEN 'warning'
            ELSE 'info'
          END AS severity,
          a.message,
          a.source
        FROM alerts a
        JOIN sites s ON s.id = a.site_id
        WHERE a.site_id = $1
          ${user.customerId ? "AND s.customer_id = $2" : ""}
          ${scopedSiteIds ? `AND s.id = ANY($${user.customerId ? 3 : 2}::uuid[])` : ""}
        ORDER BY a.created_at DESC
        LIMIT 20
      `,
      user.customerId
        ? (scopedSiteIds ? [params.id, user.customerId, scopedSiteIds] : [params.id, user.customerId])
        : [params.id]
    );

    return {
      data: result.rows,
      total: result.rows.length,
      page: 1,
      pageSize: result.rows.length,
      totalPages: 1
    };
  });
};

export async function buildSiteApp(env: ServiceEnv) {
  process.env.DATABASE_URL = env.postgresUrl;
  return createServiceApp(env, routes);
}
