import { FastifyPluginAsync } from "fastify";

import { ServiceEnv, createServiceApp, query, requireAuth } from "@netlayer/platform";
import { buildCustomerDashboardUrl } from "./grafana";

const routes: FastifyPluginAsync = async (app) => {
  app.get("/sites", { preHandler: [requireAuth] }, async (request) => {
    const user = request.auth!;
    const customerFilter = user.customerId ? "WHERE s.customer_id = $1" : "";
    const params = user.customerId ? [user.customerId] : [];

    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          s.id,
          s.customer_id,
          s.name,
          s.code,
          s.region,
          s.status,
          s.address,
          s.created_at,
          COUNT(d.id) AS device_count
        FROM sites s
        LEFT JOIN devices d ON d.site_id = s.id
        ${customerFilter}
        GROUP BY s.id
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
        SELECT
          metric_time,
          inbound_bps,
          outbound_bps,
          latency_ms,
          packet_loss_pct
        FROM site_traffic_metrics
        WHERE site_id = $1
        ORDER BY metric_time DESC
        LIMIT 288
      `,
      [params.id]
    );

    return result.rows;
  });

  app.get("/customers", { preHandler: [requireAuth] }, async (request) => {
    const user = request.auth!;
    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT id, name, code, tier, account_manager, status
        FROM customers
        ${user.customerId ? "WHERE id = $1" : ""}
        ORDER BY name
      `,
      user.customerId ? [user.customerId] : []
    );

    return result.rows;
  });

  app.get("/customers/:id/sla", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          c.id,
          c.name,
          c.sla_profile,
          c.sla_uptime_target,
          c.sla_response_minutes,
          c.sla_resolution_minutes
        FROM customers c
        WHERE c.id = $1
      `,
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
      return reply.code(503).send({ message: "Grafana dashboard UID not configured" });
    }

    return {
      url: buildCustomerDashboardUrl(params.id, dashboardUid)
    };
  });
};

export async function buildSiteApp(env: ServiceEnv) {
  process.env.DATABASE_URL = env.postgresUrl;
  return createServiceApp(env, routes);
}
