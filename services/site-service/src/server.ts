import { FastifyPluginAsync } from "fastify";

import { ServiceEnv, createServiceApp, query, requireAuth } from "@netlayer/platform";
import { buildCustomerDashboardUrl } from "./grafana";

const routes: FastifyPluginAsync = async (app) => {
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
         FROM services WHERE customer_id = $1`,
        [params.id]
      ),
      query<{ open_tickets: string; breached_tickets: string; }>(
        process.env.DATABASE_URL!,
        `SELECT
          COUNT(*) FILTER (WHERE status IN ('OPEN','IN_PROGRESS'))::text AS open_tickets,
          COUNT(*) FILTER (WHERE status IN ('OPEN','IN_PROGRESS') AND resolution_due_at IS NOT NULL AND resolution_due_at <= NOW())::text AS breached_tickets
         FROM tickets WHERE customer_id = $1`,
        [params.id]
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
        GROUP BY s.id, lm.latency_ms, lm.packet_loss_pct
        ORDER BY s.name
      `,
      [params.id]
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

    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT sv.*, s.name AS site_name, s.city, s.state
        FROM services sv
        JOIN sites s ON s.id = sv.site_id
        WHERE sv.customer_id = $1
        ORDER BY s.name, sv.service_id
      `,
      [params.id]
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
    const customerFilter = user.customerId ? "WHERE s.customer_id = $1" : "";
    const params = user.customerId ? [user.customerId] : [];

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
        GROUP BY s.id, c.name
        ORDER BY s.name
      `,
      params
    );

    return result.rows;
  });

  app.get("/sites/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
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
        GROUP BY s.id, c.name
      `,
      [params.id]
    );

    if (!result.rows[0]) {
      return reply.code(404).send({ message: "Site not found" });
    }

    return result.rows[0];
  });

  app.get("/sites/:id/traffic", { preHandler: [requireAuth] }, async (request) => {
    const params = request.params as { id: string };
    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT metric_time, inbound_bps, outbound_bps, latency_ms, packet_loss_pct
        FROM site_traffic_metrics
        WHERE site_id = $1
        ORDER BY metric_time DESC
        LIMIT 288
      `,
      [params.id]
    );

    return result.rows;
  });

  app.get("/sites/:id/services", { preHandler: [requireAuth] }, async (request) => {
    const params = request.params as { id: string };
    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          id, service_id, circuit_id, service_type, bandwidth_mbps,
          pop, last_mile, ip_block, static_ip::text,
          status, activation_date, contract_end_date, contract_months,
          monthly_charge, notes, metadata
        FROM services
        WHERE site_id = $1
        ORDER BY service_id
      `,
      [params.id]
    );

    return result.rows;
  });

  app.get("/sites/:id/devices", { preHandler: [requireAuth] }, async (request) => {
    const params = request.params as { id: string };
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
        FROM devices
        WHERE site_id = $1
        ORDER BY hostname
      `,
      [params.id]
    );

    return result.rows;
  });

  app.get("/sites/:id/events", { preHandler: [requireAuth] }, async (request) => {
    const params = request.params as { id: string };
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
        WHERE a.site_id = $1
        ORDER BY a.created_at DESC
        LIMIT 20
      `,
      [params.id]
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
