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

  app.get("/tickets", { preHandler: [requireAuth] }, async (request) => {
    const user = request.auth!;
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
        ORDER BY t.created_at DESC
      `,
      user.customerId ? [user.customerId] : []
    );

    return result.rows;
  });

  app.post("/tickets", { preHandler: [requireAuth] }, async (request, reply) => {
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
        request.auth!.userId,
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
