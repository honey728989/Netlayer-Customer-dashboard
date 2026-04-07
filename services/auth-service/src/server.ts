import bcrypt from "bcryptjs";
import { FastifyPluginAsync } from "fastify";

import {
  AuthenticatedUser,
  ServiceEnv,
  createServiceApp,
  query,
  signAccessToken,
  signRefreshToken
} from "@netlayer/platform";

const routes: FastifyPluginAsync = async (app) => {
  app.post("/auth/login", async (request, reply) => {
    const body = request.body as { email?: string; password?: string };
    if (!body.email || !body.password) {
      return reply.code(400).send({ message: "email and password are required" });
    }

    const result = await query<{
      id: string;
      email: string;
      password_hash: string;
      customer_id: string | null;
      partner_id: string | null;
      roles: string[];
    }>(
      process.env.DATABASE_URL ?? "",
      `
        SELECT
          u.id,
          u.email,
          u.password_hash,
          u.customer_id,
          u.partner_id,
          ARRAY_REMOVE(ARRAY_AGG(r.name), NULL) AS roles
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE u.email = $1 AND u.is_active = TRUE
        GROUP BY u.id
      `,
      [body.email.toLowerCase()]
    );

    const user = result.rows[0];
    if (!user) {
      return reply.code(401).send({ message: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(body.password, user.password_hash);
    if (!validPassword) {
      return reply.code(401).send({ message: "Invalid credentials" });
    }

    const principal: AuthenticatedUser = {
      userId: user.id,
      email: user.email,
      roles: user.roles as AuthenticatedUser["roles"],
      customerId: user.customer_id ?? undefined,
      partnerId: user.partner_id ?? undefined
    };

    return {
      accessToken: signAccessToken(principal, {
        accessSecret: process.env.JWT_ACCESS_SECRET!,
        refreshSecret: process.env.JWT_REFRESH_SECRET!,
        issuer: process.env.JWT_ISSUER!,
        audience: process.env.JWT_AUDIENCE!
      }),
      refreshToken: signRefreshToken(principal, {
        accessSecret: process.env.JWT_ACCESS_SECRET!,
        refreshSecret: process.env.JWT_REFRESH_SECRET!,
        issuer: process.env.JWT_ISSUER!,
        audience: process.env.JWT_AUDIENCE!
      }),
      user: principal
    };
  });

  app.get("/auth/me", async (request, reply) => {
    if (!request.auth) {
      return reply.code(401).send({ message: "Authentication required" });
    }

    return request.auth;
  });
};

export async function buildAuthApp(env: ServiceEnv) {
  process.env.DATABASE_URL = env.postgresUrl;
  process.env.JWT_ACCESS_SECRET = env.jwtAccessSecret;
  process.env.JWT_REFRESH_SECRET = env.jwtRefreshSecret;
  process.env.JWT_ISSUER = env.jwtIssuer;
  process.env.JWT_AUDIENCE = env.jwtAudience;
  return createServiceApp(env, routes, { disableAuth: false });
}
