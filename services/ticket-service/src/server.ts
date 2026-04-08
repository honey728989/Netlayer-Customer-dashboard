import { FastifyPluginAsync } from "fastify";

import { EventBus, ServiceEnv, createServiceApp, query, requireAuth } from "@netlayer/platform";

function computeDueAt(priority: string, responseMinutes: number, resolutionMinutes: number) {
  const multiplier = priority === "P1" ? 1 : priority === "P2" ? 2 : 4;
  const now = Date.now();
  return {
    responseDueAt: new Date(now + responseMinutes * multiplier * 60_000).toISOString(),
    resolutionDueAt: new Date(now + resolutionMinutes * multiplier * 60_000).toISOString()
  };
}

const routes: FastifyPluginAsync = async (app) => {
  const eventBus = new EventBus(process.env.REDIS_URL!);
  const resolveScopedSiteIds = async (user: any): Promise<string[] | null> => {
    if (!user?.customerId) {
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
      [user.userId, user.customerId]
    );

    return scoped.rows.length > 0 ? scoped.rows.map((row) => row.site_id) : null;
  };

  app.get("/tickets/sla-stats", { preHandler: [requireAuth] }, async (request) => {
    const user = request.auth!;
    const scopedSiteIds = user.customerId ? await resolveScopedSiteIds(user) : null;
    const result = await query<{
      open: string;
      in_progress: string;
      at_risk: string;
      breached: string;
      resolved_today: string;
    }>(
      process.env.DATABASE_URL!,
      `
        SELECT
          COUNT(*) FILTER (WHERE t.status = 'OPEN')::text AS open,
          COUNT(*) FILTER (WHERE t.status = 'IN_PROGRESS')::text AS in_progress,
          COUNT(*) FILTER (
            WHERE t.status IN ('OPEN', 'IN_PROGRESS')
              AND t.resolution_due_at IS NOT NULL
              AND t.resolution_due_at <= NOW() + INTERVAL '30 minutes'
              AND t.resolution_due_at > NOW()
          )::text AS at_risk,
          COUNT(*) FILTER (
            WHERE t.status IN ('OPEN', 'IN_PROGRESS')
              AND t.resolution_due_at IS NOT NULL
              AND t.resolution_due_at <= NOW()
          )::text AS breached,
          COUNT(*) FILTER (
            WHERE t.status = 'RESOLVED'
              AND t.resolved_at >= date_trunc('day', NOW())
          )::text AS resolved_today
        FROM tickets t
        ${user.customerId ? "WHERE t.customer_id = $1" : ""}
        ${scopedSiteIds ? "AND (t.site_id IS NULL OR t.site_id = ANY($2::uuid[]))" : ""}
      `,
      user.customerId ? (scopedSiteIds ? [user.customerId, scopedSiteIds] : [user.customerId]) : []
    );

    const row = result.rows[0];
    return {
      open: Number(row?.open ?? 0),
      inProgress: Number(row?.in_progress ?? 0),
      atRisk: Number(row?.at_risk ?? 0),
      breached: Number(row?.breached ?? 0),
      resolvedToday: Number(row?.resolved_today ?? 0)
    };
  });

  app.get("/tickets", { preHandler: [requireAuth] }, async (request) => {
    const user = request.auth!;
    const scopedSiteIds = user.customerId ? await resolveScopedSiteIds(user) : null;
    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          t.*,
          c.name AS customer_name,
          s.name AS site_name
        FROM tickets t
        JOIN customers c ON c.id = t.customer_id
        LEFT JOIN sites s ON s.id = t.site_id
        ${user.customerId ? "WHERE t.customer_id = $1" : ""}
        ${scopedSiteIds ? "AND (t.site_id IS NULL OR t.site_id = ANY($2::uuid[]))" : ""}
        ORDER BY t.created_at DESC
      `,
      user.customerId ? (scopedSiteIds ? [user.customerId, scopedSiteIds] : [user.customerId]) : []
    );

    return result.rows;
  });

  app.get("/tickets/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    const scopedSiteIds = user.customerId ? await resolveScopedSiteIds(user) : null;
    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          t.*,
          c.name AS customer_name,
          s.name AS site_name
        FROM tickets t
        JOIN customers c ON c.id = t.customer_id
        LEFT JOIN sites s ON s.id = t.site_id
        WHERE t.id = $1
          ${user.customerId ? "AND t.customer_id = $2" : ""}
          ${scopedSiteIds ? `AND (t.site_id IS NULL OR t.site_id = ANY($${user.customerId ? 3 : 2}::uuid[]))` : ""}
        LIMIT 1
      `,
      user.customerId ? (scopedSiteIds ? [params.id, user.customerId, scopedSiteIds] : [params.id, user.customerId]) : [params.id]
    );

    if (!result.rows[0]) {
      return reply.code(404).send({ message: "Ticket not found" });
    }

    const comments = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          tc.*,
          u.full_name AS author_name,
          ARRAY_REMOVE(ARRAY_AGG(r.name), NULL)[1] AS author_role
        FROM ticket_comments tc
        LEFT JOIN users u ON u.id = COALESCE(tc.author_user_id, tc.author_id)
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE tc.ticket_id = $1
          ${user.customerId ? "AND tc.is_internal = FALSE" : ""}
        GROUP BY tc.id, u.full_name
        ORDER BY tc.created_at ASC
      `,
      [params.id]
    );

    return {
      ...result.rows[0],
      comments: comments.rows
    };
  });

  app.get("/tickets/:id/comments", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    const scopedSiteIds = user.customerId ? await resolveScopedSiteIds(user) : null;
    const ticket = await query<{ id: string }>(
      process.env.DATABASE_URL!,
      `
        SELECT id
        FROM tickets
        WHERE id = $1
          ${user.customerId ? "AND customer_id = $2" : ""}
          ${scopedSiteIds ? `AND (site_id IS NULL OR site_id = ANY($${user.customerId ? 3 : 2}::uuid[]))` : ""}
      `,
      user.customerId ? (scopedSiteIds ? [params.id, user.customerId, scopedSiteIds] : [params.id, user.customerId]) : [params.id]
    );

    if (!ticket.rows[0]) {
      return reply.code(404).send({ message: "Ticket not found" });
    }

    const comments = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          tc.*,
          u.full_name AS author_name,
          ARRAY_REMOVE(ARRAY_AGG(r.name), NULL)[1] AS author_role
        FROM ticket_comments tc
        LEFT JOIN users u ON u.id = COALESCE(tc.author_user_id, tc.author_id)
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE tc.ticket_id = $1
          ${user.customerId ? "AND tc.is_internal = FALSE" : ""}
        GROUP BY tc.id, u.full_name
        ORDER BY tc.created_at ASC
      `,
      [params.id]
    );

    return comments.rows;
  });

  app.post("/tickets", { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.auth!;
    const body = request.body as {
      customerId: string;
      siteId?: string;
      title: string;
      description: string;
      priority: "P1" | "P2" | "P3" | "P4";
      source?: string;
      alertId?: string;
    };

    const customer = await query<{
      sla_response_minutes: number;
      sla_resolution_minutes: number;
    }>(
      process.env.DATABASE_URL!,
      `
        SELECT sla_response_minutes, sla_resolution_minutes
        FROM customers
        WHERE id = $1
      `,
      [body.customerId]
    );

    if (!customer.rows[0]) {
      return reply.code(400).send({ message: "Invalid customer" });
    }

    if (user.customerId && user.customerId !== body.customerId) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const scopedSiteIds = user.customerId ? await resolveScopedSiteIds(user) : null;
    if (body.siteId && scopedSiteIds && !scopedSiteIds.includes(body.siteId)) {
      return reply.code(403).send({ message: "Site is outside your allowed customer scope" });
    }

    const sla = computeDueAt(
      body.priority,
      customer.rows[0].sla_response_minutes,
      customer.rows[0].sla_resolution_minutes
    );

    const result = await query(
      process.env.DATABASE_URL!,
      `
        INSERT INTO tickets (
          customer_id,
          site_id,
          alert_id,
          title,
          description,
          priority,
          status,
          source,
          opened_by,
          response_due_at,
          resolution_due_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'OPEN', $7, $8, $9, $10)
        RETURNING *
      `,
      [
        body.customerId,
        body.siteId ?? null,
        body.alertId ?? null,
        body.title,
        body.description,
        body.priority,
        body.source ?? "PORTAL",
        user.userId,
        sla.responseDueAt,
        sla.resolutionDueAt
      ]
    );

    await eventBus.publish("alerts", {
      type: "ticket.created",
      payload: result.rows[0]
    });

    reply.code(201);
    return result.rows[0];
  });

  app.patch("/tickets/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as {
      status?: string;
      assigneeId?: string;
      resolutionSummary?: string;
    };

    const result = await query(
      process.env.DATABASE_URL!,
      `
        UPDATE tickets
        SET
          status = COALESCE($2, status),
          assignee_id = COALESCE($3, assignee_id),
          resolution_summary = COALESCE($4, resolution_summary),
          resolved_at = CASE WHEN $2 = 'RESOLVED' THEN NOW() ELSE resolved_at END,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [params.id, body.status ?? null, body.assigneeId ?? null, body.resolutionSummary ?? null]
    );

    if (!result.rows[0]) {
      return reply.code(404).send({ message: "Ticket not found" });
    }

    await eventBus.publish("alerts", {
      type: "ticket.updated",
      payload: result.rows[0]
    });

    return result.rows[0];
  });

  app.post("/tickets/:id/comments", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const user = request.auth!;
    const scopedSiteIds = user.customerId ? await resolveScopedSiteIds(user) : null;
    const body = request.body as {
      body: string;
      isInternal?: boolean;
    };

    const ticket = await query<{ id: string }>(
      process.env.DATABASE_URL!,
      `
        SELECT id
        FROM tickets
        WHERE id = $1
          ${user.customerId ? "AND customer_id = $2" : ""}
          ${scopedSiteIds ? `AND (site_id IS NULL OR site_id = ANY($${user.customerId ? 3 : 2}::uuid[]))` : ""}
      `,
      user.customerId ? (scopedSiteIds ? [params.id, user.customerId, scopedSiteIds] : [params.id, user.customerId]) : [params.id]
    );

    if (!ticket.rows[0]) {
      return reply.code(404).send({ message: "Ticket not found" });
    }

    const isInternal = Boolean(body.isInternal) && !user.customerId;
    const inserted = await query(
      process.env.DATABASE_URL!,
      `
        INSERT INTO ticket_comments (
          ticket_id,
          author_id,
          author_user_id,
          body,
          is_internal
        )
        VALUES ($1, $2, $2, $3, $4)
        RETURNING id
      `,
      [params.id, user.userId, body.body, isInternal]
    );

    const comment = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          tc.*,
          u.full_name AS author_name,
          ARRAY_REMOVE(ARRAY_AGG(r.name), NULL)[1] AS author_role
        FROM ticket_comments tc
        LEFT JOIN users u ON u.id = COALESCE(tc.author_user_id, tc.author_id)
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE tc.id = $1
        GROUP BY tc.id, u.full_name
      `,
      [inserted.rows[0].id]
    );

    reply.code(201);
    return comment.rows[0];
  });

  app.post("/internal/tickets/auto-create", async (request, reply) => {
    const token = request.headers["x-internal-token"];
    if (token !== process.env.INTERNAL_SERVICE_TOKEN) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const body = request.body as {
      customerId: string;
      siteId: string;
      alertId: string;
      title: string;
      description: string;
      priority: "P1" | "P2";
    };

    const result = await query<{
      id: string;
    }>(
      process.env.DATABASE_URL!,
      `
        INSERT INTO tickets (
          customer_id,
          site_id,
          alert_id,
          title,
          description,
          priority,
          status,
          source,
          opened_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'OPEN', 'MONITORING', NULL)
        ON CONFLICT (alert_id) DO NOTHING
        RETURNING id
      `,
      [body.customerId, body.siteId, body.alertId, body.title, body.description, body.priority]
    );

    reply.code(result.rows[0] ? 201 : 200);
    return { created: Boolean(result.rows[0]), ticketId: result.rows[0]?.id };
  });
};

export async function buildTicketApp(env: ServiceEnv) {
  process.env.DATABASE_URL = env.postgresUrl;
  process.env.REDIS_URL = env.redisUrl;
  process.env.INTERNAL_SERVICE_TOKEN = env.internalServiceToken;
  return createServiceApp(env, routes);
}
