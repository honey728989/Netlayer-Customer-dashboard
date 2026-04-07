import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";

import { ServiceEnv, createServiceApp, requestJson } from "@netlayer/platform";

const routes: FastifyPluginAsync = async (app) => {
  async function forward(requestPath: string, request: FastifyRequest, reply: FastifyReply) {
    const serviceBase = resolveUpstream(requestPath);
    const upstreamPath = requestPath.replace("/api/v1", "");
    const targetUrl = new URL(upstreamPath + buildQuery(request.url), serviceBase);
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        "content-type": "application/json",
        authorization: request.headers.authorization ?? "",
        "x-request-id": request.id,
        "x-forwarded-for": request.ip,
        "x-forwarded-proto": request.protocol
      },
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : JSON.stringify(request.body ?? {})
    });

    const body = await response.text();
    reply.code(response.status);
    if (body.length === 0) {
      return null;
    }

    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }

  function buildQuery(url: string) {
    const index = url.indexOf("?");
    return index >= 0 ? url.slice(index) : "";
  }

  function resolveUpstream(path: string) {
    if (path.startsWith("/api/v1/auth")) return process.env.AUTH_SERVICE_URL!;
    if (/^\/api\/v1\/customers\/[^/]+\/billing/.test(path) || path.startsWith("/api/v1/billing")) {
      return process.env.BILLING_SERVICE_URL!;
    }
    if (path.startsWith("/api/v1/customers") || path.startsWith("/api/v1/sites")) {
      return process.env.SITE_SERVICE_URL!;
    }
    if (path.startsWith("/api/v1/alerts")) return process.env.MONITORING_SERVICE_URL!;
    if (path.startsWith("/api/v1/tickets")) return process.env.TICKET_SERVICE_URL!;
    if (path.startsWith("/api/v1/partners")) return process.env.PARTNER_SERVICE_URL!;
    throw new Error("Route not mapped");
  }

  app.get("/api/v1/health", async () => ({ status: "ok" }));

  app.all("/api/v1/*", async (request, reply) => {
    const path = request.url.split("?")[0];
    if (!path.startsWith("/api/v1/auth") && !request.auth) {
      return reply.code(401).send({ message: "Authentication required" });
    }

    return forward(path, request, reply);
  });
};

export async function buildGatewayApp(env: ServiceEnv) {
  process.env.AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL ?? "http://auth-service:4001";
  process.env.SITE_SERVICE_URL = process.env.SITE_SERVICE_URL ?? "http://site-service:4002";
  process.env.MONITORING_SERVICE_URL =
    process.env.MONITORING_SERVICE_URL ?? "http://monitoring-service:4003";
  process.env.TICKET_SERVICE_URL = process.env.TICKET_SERVICE_URL ?? "http://ticket-service:4004";
  process.env.BILLING_SERVICE_URL =
    process.env.BILLING_SERVICE_URL ?? "http://billing-service:4005";
  process.env.PARTNER_SERVICE_URL = process.env.PARTNER_SERVICE_URL ?? "http://partner-service:4006";
  return createServiceApp(env, routes, {
    rateLimitMax: Math.min(env.rateLimitMax, 120),
    rateLimitWindow: env.rateLimitWindow,
    healthIndicators: [
      {
        name: "auth-service",
        check: async () => {
          await requestJson(`${process.env.AUTH_SERVICE_URL}/health`, { timeoutMs: 3000 });
          return { status: "ok" as const };
        }
      },
      {
        name: "site-service",
        check: async () => {
          await requestJson(`${process.env.SITE_SERVICE_URL}/health`, { timeoutMs: 3000 });
          return { status: "ok" as const };
        }
      },
      {
        name: "monitoring-service",
        check: async () => {
          await requestJson(`${process.env.MONITORING_SERVICE_URL}/health`, { timeoutMs: 3000 });
          return { status: "ok" as const };
        }
      },
      {
        name: "ticket-service",
        check: async () => {
          await requestJson(`${process.env.TICKET_SERVICE_URL}/health`, { timeoutMs: 3000 });
          return { status: "ok" as const };
        }
      },
      {
        name: "billing-service",
        check: async () => {
          await requestJson(`${process.env.BILLING_SERVICE_URL}/health`, { timeoutMs: 3000 });
          return { status: "ok" as const };
        }
      },
      {
        name: "partner-service",
        check: async () => {
          await requestJson(`${process.env.PARTNER_SERVICE_URL}/health`, { timeoutMs: 3000 });
          return { status: "ok" as const };
        }
      }
    ]
  });
}
