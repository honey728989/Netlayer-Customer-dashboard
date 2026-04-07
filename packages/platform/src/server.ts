import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import { FastifyPluginAsync, fastify } from "fastify";
import Redis from "ioredis";

import { query } from "./db";
import { buildLogger } from "./logger";
import { HealthIndicator, runHealthChecks } from "./health";
import { getMetricsRegistry, httpRequestDuration, rateLimitCounter } from "./metrics";
import { ServiceEnv } from "./types";

export async function createServiceApp(
  env: ServiceEnv,
  routes: FastifyPluginAsync,
  options?: {
    disableAuth?: boolean;
    healthIndicators?: HealthIndicator[];
    trustProxy?: boolean;
    rateLimitMax?: number;
    rateLimitWindow?: string;
  }
) {
  const app = fastify({
    loggerInstance: buildLogger(env.serviceName, env.logLevel),
    trustProxy: options?.trustProxy ?? true
  });
  const rateLimitRedis = new Redis(env.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1
  });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(sensible);
  await app.register(rateLimit, {
    global: true,
    max: options?.rateLimitMax ?? env.rateLimitMax,
    timeWindow: options?.rateLimitWindow ?? env.rateLimitWindow,
    redis: rateLimitRedis,
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: () => {
      rateLimitCounter.inc({ service: env.serviceName, scope: "fastify" });
      return {
        statusCode: 429,
        error: "Too Many Requests",
        message: "Rate limit exceeded"
      };
    }
  });
  await app.register(jwt, {
    secret: env.jwtAccessSecret
  });

  app.decorateRequest("auth", undefined);

  app.addHook("onResponse", async (request, reply) => {
    const route = request.routeOptions.url ?? request.url.split("?")[0];
    httpRequestDuration.observe(
      {
        service: env.serviceName,
        method: request.method,
        route,
        status_code: String(reply.statusCode)
      },
      reply.elapsedTime / 1000
    );
  });

  if (!options?.disableAuth) {
    app.addHook("onRequest", async (request) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
          return;
        }

        const payload = await request.jwtVerify<{
          userId: string;
          email: string;
          fullName?: string;
          roles: string[];
          customerId?: string;
          partnerId?: string;
          organizationName?: string;
          accountScope?: "platform" | "customer" | "partner" | "internal";
        }>({
        });

        request.auth = {
          userId: payload.userId,
          email: payload.email,
          fullName: payload.fullName,
          roles: payload.roles as never,
          customerId: payload.customerId,
          partnerId: payload.partnerId,
          organizationName: payload.organizationName,
          accountScope: payload.accountScope
        };
      } catch {
        request.auth = undefined;
      }
    });
  }

  app.get("/health", async () =>
    runHealthChecks([
      {
        name: "postgres",
        check: async () => {
          await query(env.postgresUrl, "SELECT 1");
          return { status: "ok" as const };
        }
      },
      {
        name: "redis",
        check: async () => {
          const redis = new Redis(env.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
          await redis.connect();
          const pong = await redis.ping();
          await redis.quit();
          if (pong !== "PONG") {
            throw new Error("Redis ping failed");
          }
          return { status: "ok" as const };
        }
      },
      ...(options?.healthIndicators ?? [])
    ])
  );

  app.get("/metrics", async (_request, reply) => {
    reply.header("content-type", getMetricsRegistry().contentType);
    return getMetricsRegistry().metrics();
  });

  await app.register(routes, { prefix: "/" });

  return app;
}
