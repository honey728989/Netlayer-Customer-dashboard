import { FastifyPluginAsync } from "fastify";

import {
  ServiceEnv,
  createServiceApp,
  query,
  requireAuth
} from "@netlayer/platform";

function normalizeStage(stage?: string) {
  return stage?.toUpperCase().replace(/\s+/g, "_");
}

const routes: FastifyPluginAsync = async (app) => {
  app.get("/partners", { preHandler: [requireAuth] }, async (request) => {
    const user = request.auth!;
    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT id, name, code, region, status, commission_plan
        FROM partners
        ${user.partnerId ? "WHERE id = $1" : ""}
        ORDER BY name
      `,
      user.partnerId ? [user.partnerId] : []
    );

    return result.rows;
  });

  app.get("/partners/:id/revenue", { preHandler: [requireAuth] }, async (request) => {
    const params = request.params as { id: string };
    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          p.id,
          p.name,
          COALESCE(SUM(c.monthly_recurring_revenue), 0) AS monthly_revenue,
          COALESCE(SUM(c.annual_contract_value), 0) AS annual_contract_value
        FROM partners p
        LEFT JOIN customers c ON c.partner_id = p.id
        WHERE p.id = $1
        GROUP BY p.id
      `,
      [params.id]
    );

    return result.rows[0] ?? null;
  });

  app.get("/partners/:id/commission", { preHandler: [requireAuth] }, async (request) => {
    const params = request.params as { id: string };
    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          commission_period,
          gross_revenue,
          commission_rate,
          commission_amount,
          status
        FROM commissions
        WHERE partner_id = $1
        ORDER BY commission_period DESC
      `,
      [params.id]
    );

    return result.rows;
  });

  app.get("/partners/:id/customers", { preHandler: [requireAuth] }, async (request) => {
    const params = request.params as { id: string };
    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          c.id,
          c.code,
          c.name,
          c.status,
          c.tier,
          c.monthly_recurring_revenue,
          c.annual_contract_value,
          COUNT(DISTINCT s.id) AS site_count,
          COUNT(DISTINCT sv.id) AS service_count
        FROM customers c
        LEFT JOIN sites s ON s.customer_id = c.id
        LEFT JOIN services sv ON sv.customer_id = c.id
        WHERE c.partner_id = $1
        GROUP BY c.id
        ORDER BY c.name
      `,
      [params.id]
    );

    return result.rows;
  });

  app.get("/partners/:id/dashboard", { preHandler: [requireAuth] }, async (request) => {
    const params = request.params as { id: string };
    const [revenue, leads, commissions] = await Promise.all([
      query<{
        active_customers: string;
        active_services: string;
        monthly_revenue: string;
      }>(
        process.env.DATABASE_URL!,
        `
          SELECT
            COUNT(DISTINCT c.id)::text AS active_customers,
            COUNT(DISTINCT sv.id)::text AS active_services,
            COALESCE(SUM(c.monthly_recurring_revenue), 0)::text AS monthly_revenue
          FROM customers c
          LEFT JOIN services sv ON sv.customer_id = c.id
          WHERE c.partner_id = $1
        `,
        [params.id]
      ),
      query<{
        total_leads: string;
        won_leads: string;
        proposal_leads: string;
      }>(
        process.env.DATABASE_URL!,
        `
          SELECT
            COUNT(*)::text AS total_leads,
            COUNT(*) FILTER (WHERE stage = 'WON')::text AS won_leads,
            COUNT(*) FILTER (WHERE stage IN ('PROPOSAL', 'NEGOTIATION'))::text AS proposal_leads
          FROM leads
          WHERE partner_id = $1
        `,
        [params.id]
      ),
      query<{
        pending_commission: string;
        approved_commission: string;
      }>(
        process.env.DATABASE_URL!,
        `
          SELECT
            COALESCE(SUM(commission_amount) FILTER (WHERE status = 'PENDING'), 0)::text AS pending_commission,
            COALESCE(SUM(commission_amount) FILTER (WHERE status = 'APPROVED'), 0)::text AS approved_commission
          FROM commissions
          WHERE partner_id = $1
        `,
        [params.id]
      )
    ]);

    return {
      customers: {
        active: Number(revenue.rows[0]?.active_customers ?? 0),
        services: Number(revenue.rows[0]?.active_services ?? 0),
        monthlyRevenue: Number(revenue.rows[0]?.monthly_revenue ?? 0)
      },
      leads: {
        total: Number(leads.rows[0]?.total_leads ?? 0),
        won: Number(leads.rows[0]?.won_leads ?? 0),
        inCommercials: Number(leads.rows[0]?.proposal_leads ?? 0)
      },
      commissions: {
        pending: Number(commissions.rows[0]?.pending_commission ?? 0),
        approved: Number(commissions.rows[0]?.approved_commission ?? 0)
      }
    };
  });

  app.get("/leads", { preHandler: [requireAuth] }, async (request) => {
    const user = request.auth!;
    const querystring = request.query as {
      stage?: string;
      ownerUserId?: string;
      partnerId?: string;
    };
    const filters: string[] = [];
    const params: unknown[] = [];

    if (user.partnerId) {
      filters.push(`l.partner_id = $${params.length + 1}`);
      params.push(user.partnerId);
    }

    if (querystring.partnerId) {
      filters.push(`l.partner_id = $${params.length + 1}`);
      params.push(querystring.partnerId);
    }

    if (querystring.ownerUserId) {
      filters.push(`l.owner_user_id = $${params.length + 1}`);
      params.push(querystring.ownerUserId);
    }

    if (querystring.stage) {
      filters.push(`l.stage = $${params.length + 1}`);
      params.push(normalizeStage(querystring.stage));
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          l.*,
          p.name AS partner_name,
          u.full_name AS owner_name,
          c.name AS converted_customer_name
        FROM leads l
        LEFT JOIN partners p ON p.id = l.partner_id
        LEFT JOIN users u ON u.id = l.owner_user_id
        LEFT JOIN customers c ON c.id = l.customer_id
        ${whereClause}
        ORDER BY l.created_at DESC
      `,
      params
    );

    return result.rows;
  });

  app.get("/leads/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          l.*,
          p.name AS partner_name,
          u.full_name AS owner_name,
          c.name AS converted_customer_name
        FROM leads l
        LEFT JOIN partners p ON p.id = l.partner_id
        LEFT JOIN users u ON u.id = l.owner_user_id
        LEFT JOIN customers c ON c.id = l.customer_id
        WHERE l.id = $1
      `,
      [params.id]
    );

    if (!result.rows[0]) {
      return reply.code(404).send({ message: "Lead not found" });
    }

    return result.rows[0];
  });

  app.post("/leads", { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as {
      partnerId?: string;
      source: string;
      companyName: string;
      contactName: string;
      contactEmail?: string;
      contactPhone?: string;
      serviceType: string;
      bandwidthRequiredMbps?: number;
      city?: string;
      state?: string;
      expectedMrc?: number;
      expectedNrc?: number;
      notes?: string;
      expectedCloseDate?: string;
    };

    const partnerId = request.auth!.partnerId ?? body.partnerId ?? null;
    const result = await query(
      process.env.DATABASE_URL!,
      `
        INSERT INTO leads (
          partner_id,
          owner_user_id,
          source,
          company_name,
          contact_name,
          contact_email,
          contact_phone,
          service_type,
          bandwidth_required_mbps,
          city,
          state,
          expected_mrc,
          expected_nrc,
          stage,
          notes,
          expected_close_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'NEW', $14, $15)
        RETURNING *
      `,
      [
        partnerId,
        request.auth!.userId,
        body.source,
        body.companyName,
        body.contactName,
        body.contactEmail ?? null,
        body.contactPhone ?? null,
        body.serviceType,
        body.bandwidthRequiredMbps ?? 100,
        body.city ?? null,
        body.state ?? null,
        body.expectedMrc ?? 0,
        body.expectedNrc ?? 0,
        body.notes ?? null,
        body.expectedCloseDate ?? null
      ]
    );

    await query(
      process.env.DATABASE_URL!,
      `
        INSERT INTO lead_activities (lead_id, author_user_id, activity_type, body)
        VALUES ($1, $2, 'CREATED', $3)
      `,
      [result.rows[0].id, request.auth!.userId, "Lead created"]
    );

    reply.code(201);
    return result.rows[0];
  });

  app.patch("/leads/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as {
      stage?: string;
      probabilityPercent?: number;
      expectedMrc?: number;
      expectedNrc?: number;
      lostReason?: string;
      notes?: string;
      expectedCloseDate?: string;
    };

    const result = await query(
      process.env.DATABASE_URL!,
      `
        UPDATE leads
        SET
          stage = COALESCE($2, stage),
          probability_percent = COALESCE($3, probability_percent),
          expected_mrc = COALESCE($4, expected_mrc),
          expected_nrc = COALESCE($5, expected_nrc),
          lost_reason = COALESCE($6, lost_reason),
          notes = COALESCE($7, notes),
          expected_close_date = COALESCE($8, expected_close_date),
          converted_at = CASE WHEN COALESCE($2, stage) = 'WON' THEN COALESCE(converted_at, NOW()) ELSE converted_at END,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [
        params.id,
        body.stage ? normalizeStage(body.stage) : null,
        body.probabilityPercent ?? null,
        body.expectedMrc ?? null,
        body.expectedNrc ?? null,
        body.lostReason ?? null,
        body.notes ?? null,
        body.expectedCloseDate ?? null
      ]
    );

    if (!result.rows[0]) {
      return reply.code(404).send({ message: "Lead not found" });
    }

    await query(
      process.env.DATABASE_URL!,
      `
        INSERT INTO lead_activities (lead_id, author_user_id, activity_type, body, metadata)
        VALUES ($1, $2, 'UPDATED', $3, $4::jsonb)
      `,
      [
        params.id,
        request.auth!.userId,
        "Lead updated",
        JSON.stringify({
          stage: body.stage ? normalizeStage(body.stage) : undefined,
          probabilityPercent: body.probabilityPercent
        })
      ]
    );

    return result.rows[0];
  });

  app.get("/leads/:id/activities", { preHandler: [requireAuth] }, async (request) => {
    const params = request.params as { id: string };
    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          la.*,
          u.full_name AS author_name
        FROM lead_activities la
        LEFT JOIN users u ON u.id = la.author_user_id
        WHERE la.lead_id = $1
        ORDER BY la.created_at DESC
      `,
      [params.id]
    );

    return result.rows;
  });

  app.post("/leads/:id/activities", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as {
      activityType: string;
      body: string;
      metadata?: Record<string, unknown>;
    };

    const result = await query(
      process.env.DATABASE_URL!,
      `
        INSERT INTO lead_activities (lead_id, author_user_id, activity_type, body, metadata)
        VALUES ($1, $2, $3, $4, $5::jsonb)
        RETURNING *
      `,
      [
        params.id,
        request.auth!.userId,
        body.activityType.toUpperCase(),
        body.body,
        JSON.stringify(body.metadata ?? {})
      ]
    );

    reply.code(201);
    return result.rows[0];
  });

  app.get("/sales/dashboard", { preHandler: [requireAuth] }, async (request) => {
    const user = request.auth!;
    const ownerId = user.roles.includes("SALES_EXECUTIVE") ? user.userId : null;
    const params = ownerId ? [ownerId] : [];
    const ownerFilter = ownerId ? "WHERE owner_user_id = $1" : "";

    const [leadStats, taskStats, feasibilityStats] = await Promise.all([
      query<{
        total: string;
        qualified: string;
        proposal: string;
        won: string;
        pipeline_mrc: string;
      }>(
        process.env.DATABASE_URL!,
        `
          SELECT
            COUNT(*)::text AS total,
            COUNT(*) FILTER (WHERE stage IN ('QUALIFIED', 'PROPOSAL', 'NEGOTIATION'))::text AS qualified,
            COUNT(*) FILTER (WHERE stage = 'PROPOSAL')::text AS proposal,
            COUNT(*) FILTER (WHERE stage = 'WON')::text AS won,
            COALESCE(SUM(expected_mrc) FILTER (WHERE stage IN ('QUALIFIED', 'PROPOSAL', 'NEGOTIATION')), 0)::text AS pipeline_mrc
          FROM leads
          ${ownerFilter}
        `,
        params
      ),
      query<{
        open_tasks: string;
        due_today: string;
      }>(
        process.env.DATABASE_URL!,
        `
          SELECT
            COUNT(*) FILTER (WHERE lt.status = 'OPEN')::text AS open_tasks,
            COUNT(*) FILTER (
              WHERE lt.status = 'OPEN'
                AND lt.due_at IS NOT NULL
                AND lt.due_at < date_trunc('day', NOW()) + INTERVAL '1 day'
            )::text AS due_today
          FROM lead_tasks lt
          ${ownerId ? "WHERE lt.assignee_user_id = $1" : ""}
        `,
        params
      ),
      query<{
        active_requests: string;
      }>(
        process.env.DATABASE_URL!,
        `
          SELECT
            COUNT(*) FILTER (
              WHERE status NOT IN ('CONVERTED', 'CLOSED', 'NOT_FEASIBLE')
            )::text AS active_requests
          FROM feasibility_requests
        `
      )
    ]);

    return {
      leads: {
        total: Number(leadStats.rows[0]?.total ?? 0),
        qualified: Number(leadStats.rows[0]?.qualified ?? 0),
        proposal: Number(leadStats.rows[0]?.proposal ?? 0),
        won: Number(leadStats.rows[0]?.won ?? 0),
        pipelineMrc: Number(leadStats.rows[0]?.pipeline_mrc ?? 0)
      },
      tasks: {
        open: Number(taskStats.rows[0]?.open_tasks ?? 0),
        dueToday: Number(taskStats.rows[0]?.due_today ?? 0)
      },
      feasibility: {
        activeRequests: Number(feasibilityStats.rows[0]?.active_requests ?? 0)
      }
    };
  });

  app.get("/sales/tasks", { preHandler: [requireAuth] }, async (request) => {
    const user = request.auth!;
    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          lt.*,
          l.company_name,
          l.stage
        FROM lead_tasks lt
        JOIN leads l ON l.id = lt.lead_id
        ${user.roles.includes("SALES_EXECUTIVE") ? "WHERE lt.assignee_user_id = $1" : ""}
        ORDER BY lt.status, lt.due_at NULLS LAST, lt.created_at DESC
      `,
      user.roles.includes("SALES_EXECUTIVE") ? [user.userId] : []
    );

    return result.rows;
  });

  app.get("/feasibility", { preHandler: [requireAuth] }, async (request) => {
    const user = request.auth!;
    const querystring = request.query as { status?: string; customerId?: string };
    const filters: string[] = [];
    const params: unknown[] = [];

    if (user.customerId) {
      filters.push(`fr.customer_id = $${params.length + 1}`);
      params.push(user.customerId);
    }

    if (querystring.customerId) {
      filters.push(`fr.customer_id = $${params.length + 1}`);
      params.push(querystring.customerId);
    }

    if (querystring.status) {
      filters.push(`fr.status = $${params.length + 1}`);
      params.push(normalizeStage(querystring.status));
    }

    if (user.roles.includes("FIELD_ENGINEER")) {
      filters.push(`fr.assigned_engineer_user_id = $${params.length + 1}`);
      params.push(user.userId);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          fr.*,
          c.name AS customer_name,
          u.full_name AS requested_by_name,
          fu.full_name AS assigned_engineer_name
        FROM feasibility_requests fr
        LEFT JOIN customers c ON c.id = fr.customer_id
        LEFT JOIN users u ON u.id = fr.requested_by_user_id
        LEFT JOIN users fu ON fu.id = fr.assigned_engineer_user_id
        ${whereClause}
        ORDER BY fr.created_at DESC
      `,
      params
    );

    return result.rows;
  });

  app.post("/feasibility", { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as {
      customerId?: string;
      leadId?: string;
      assignedEngineerUserId?: string;
      source?: string;
      siteName: string;
      address: string;
      city: string;
      state: string;
      pincode?: string;
      latitude?: number;
      longitude?: number;
      contactName: string;
      contactEmail?: string;
      contactPhone?: string;
      serviceType: string;
      bandwidthRequiredMbps: number;
      redundancyRequired?: boolean;
      expectedGoLiveDate?: string;
      surveyNotes?: string;
    };

    const requestCodeResult = await query<{ next_code: string }>(
      process.env.DATABASE_URL!,
      `
        SELECT 'FEAS-' || LPAD((COALESCE(MAX(NULLIF(regexp_replace(request_code, '\D', '', 'g'), '')), '0')::int + 1)::text, 4, '0') AS next_code
        FROM feasibility_requests
      `
    );

    const result = await query(
      process.env.DATABASE_URL!,
      `
        INSERT INTO feasibility_requests (
          customer_id,
          lead_id,
          requested_by_user_id,
          assigned_engineer_user_id,
          source,
          request_code,
          site_name,
          address,
          city,
          state,
          pincode,
          latitude,
          longitude,
          contact_name,
          contact_email,
          contact_phone,
          service_type,
          bandwidth_required_mbps,
          redundancy_required,
          expected_go_live_date,
          status,
          survey_notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 'REQUESTED', $21)
        RETURNING *
      `,
      [
        request.auth!.customerId ?? body.customerId ?? null,
        body.leadId ?? null,
        request.auth!.userId,
        body.assignedEngineerUserId ?? null,
        body.source ?? (request.auth!.customerId ? "CUSTOMER_PORTAL" : "INTERNAL"),
        requestCodeResult.rows[0]?.next_code ?? `FEAS-${Date.now()}`,
        body.siteName,
        body.address,
        body.city,
        body.state,
        body.pincode ?? null,
        body.latitude ?? null,
        body.longitude ?? null,
        body.contactName,
        body.contactEmail ?? null,
        body.contactPhone ?? null,
        body.serviceType,
        body.bandwidthRequiredMbps,
        body.redundancyRequired ?? false,
        body.expectedGoLiveDate ?? null,
        body.surveyNotes ?? null
      ]
    );

    await query(
      process.env.DATABASE_URL!,
      `
        INSERT INTO feasibility_comments (feasibility_request_id, author_user_id, body, is_internal)
        VALUES ($1, $2, $3, $4)
      `,
      [
        result.rows[0].id,
        request.auth!.userId,
        "Feasibility request created",
        !request.auth!.customerId
      ]
    );

    reply.code(201);
    return result.rows[0];
  });

  app.patch("/feasibility/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as {
      status?: string;
      assignedEngineerUserId?: string;
      surveyScheduledFor?: string;
      surveyNotes?: string;
      feasibilitySummary?: string;
      estimatedCapex?: number;
      estimatedMrc?: number;
    };

    const result = await query(
      process.env.DATABASE_URL!,
      `
        UPDATE feasibility_requests
        SET
          status = COALESCE($2, status),
          assigned_engineer_user_id = COALESCE($3, assigned_engineer_user_id),
          survey_scheduled_for = COALESCE($4, survey_scheduled_for),
          survey_notes = COALESCE($5, survey_notes),
          feasibility_summary = COALESCE($6, feasibility_summary),
          estimated_capex = COALESCE($7, estimated_capex),
          estimated_mrc = COALESCE($8, estimated_mrc),
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [
        params.id,
        body.status ? normalizeStage(body.status) : null,
        body.assignedEngineerUserId ?? null,
        body.surveyScheduledFor ?? null,
        body.surveyNotes ?? null,
        body.feasibilitySummary ?? null,
        body.estimatedCapex ?? null,
        body.estimatedMrc ?? null
      ]
    );

    if (!result.rows[0]) {
      return reply.code(404).send({ message: "Feasibility request not found" });
    }

    return result.rows[0];
  });

  app.get("/feasibility/:id/comments", { preHandler: [requireAuth] }, async (request) => {
    const params = request.params as { id: string };
    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          fc.*,
          u.full_name AS author_name
        FROM feasibility_comments fc
        LEFT JOIN users u ON u.id = fc.author_user_id
        WHERE feasibility_request_id = $1
        ORDER BY created_at ASC
      `,
      [params.id]
    );

    return result.rows;
  });

  app.post("/feasibility/:id/comments", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as { body: string; isInternal?: boolean };
    const result = await query(
      process.env.DATABASE_URL!,
      `
        INSERT INTO feasibility_comments (feasibility_request_id, author_user_id, body, is_internal)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [params.id, request.auth!.userId, body.body, body.isInternal ?? false]
    );

    reply.code(201);
    return result.rows[0];
  });
};

export async function buildPartnerApp(env: ServiceEnv) {
  process.env.DATABASE_URL = env.postgresUrl;
  return createServiceApp(env, routes);
}
