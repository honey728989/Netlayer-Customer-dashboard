import { FastifyPluginAsync } from "fastify";

import { ServiceEnv, createServiceApp, query, requireAuth } from "@netlayer/platform";

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
};

export async function buildPartnerApp(env: ServiceEnv) {
  process.env.DATABASE_URL = env.postgresUrl;
  return createServiceApp(env, routes);
}
