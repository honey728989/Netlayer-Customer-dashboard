import { FastifyPluginAsync } from "fastify";

import {
  EventBus,
  ServiceEnv,
  createServiceApp,
  query,
  requestJson,
  requireAuth
} from "@netlayer/platform";

import {
  buildAlertFingerprint,
  buildZabbixBreaker,
  enqueueAlertJob,
  reserveAlertDedup,
  touchAlertDedup,
  startAlertWorker
} from "./reliability";
import { ZabbixClient } from "./zabbix";

function mapSeverity(priority: string) {
  if (priority === String(process.env.ZABBIX_SEVERITY_P1 ?? "5")) {
    return "P1";
  }
  if (priority === String(process.env.ZABBIX_SEVERITY_P2 ?? "4")) {
    return "P2";
  }
  if (priority === "3") {
    return "P3";
  }
  return "P4";
}

function buildZabbixClient() {
  return new ZabbixClient(
    process.env.ZABBIX_URL!,
    process.env.ZABBIX_USERNAME!,
    process.env.ZABBIX_PASSWORD!
  );
}

const routes: FastifyPluginAsync = async (app) => {
  const eventBus = new EventBus(process.env.REDIS_URL!);

  app.get("/alerts/count", { preHandler: [requireAuth] }, async (request) => {
    const user = request.auth!;
    const result = await query<{
      total: string;
      critical: string;
      warning: string;
      info: string;
    }>(
      process.env.DATABASE_URL!,
      `
        SELECT
          COUNT(*) FILTER (WHERE a.status = 'OPEN')::text AS total,
          COUNT(*) FILTER (WHERE a.status = 'OPEN' AND a.severity IN ('P1', 'P2'))::text AS critical,
          COUNT(*) FILTER (WHERE a.status = 'OPEN' AND a.severity = 'P3')::text AS warning,
          COUNT(*) FILTER (WHERE a.status = 'OPEN' AND a.severity = 'P4')::text AS info
        FROM alerts a
        JOIN sites s ON s.id = a.site_id
        ${user.customerId ? "WHERE s.customer_id = $1" : ""}
      `,
      user.customerId ? [user.customerId] : []
    );

    const row = result.rows[0];
    return {
      total: Number(row?.total ?? 0),
      critical: Number(row?.critical ?? 0),
      warning: Number(row?.warning ?? 0),
      info: Number(row?.info ?? 0)
    };
  });

  app.get("/alerts", { preHandler: [requireAuth] }, async (request) => {
    const user = request.auth!;
    const result = await query(
      process.env.DATABASE_URL!,
      `
        SELECT
          a.*,
          s.name AS site_name,
          d.hostname AS device_hostname
        FROM alerts a
        JOIN sites s ON s.id = a.site_id
        LEFT JOIN devices d ON d.id = a.device_id
        ${user.customerId ? "WHERE s.customer_id = $1" : ""}
        ORDER BY a.created_at DESC
        LIMIT 200
      `,
      user.customerId ? [user.customerId] : []
    );

    return result.rows;
  });

  app.post("/alerts/:id/ack", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { id: string };
    const result = await query(
      process.env.DATABASE_URL!,
      `
        UPDATE alerts
        SET status = 'ACKNOWLEDGED', acknowledged_by = $2, acknowledged_at = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [params.id, request.auth!.userId]
    );

    if (!result.rows[0]) {
      return reply.code(404).send({ message: "Alert not found" });
    }

    await eventBus.publish("alerts", {
      type: "alert.acknowledged",
      payload: result.rows[0]
    });

    return result.rows[0];
  });
};

export async function startZabbixPoller() {
  if (!process.env.ZABBIX_URL) {
    return;
  }

  const eventBus = new EventBus(process.env.REDIS_URL!);
  const queueConfig = {
    redisUrl: process.env.REDIS_URL!,
    serviceName: "monitoring-service",
    attempts: Number(process.env.QUEUE_DEFAULT_ATTEMPTS ?? 5),
    backoffMs: Number(process.env.QUEUE_BACKOFF_MS ?? 10000)
  };
  const client = buildZabbixClient();
  const circuitBreaker = buildZabbixBreaker();
  await startAlertWorker(queueConfig, eventBus);

  setInterval(async () => {
    try {
      const triggers = await circuitBreaker.execute(() => client.getTriggers());
      for (const trigger of triggers) {
        const siteLookup = await query<{
          site_id: string;
          customer_id: string;
          device_id: string;
        }>(
          process.env.DATABASE_URL!,
          `
            SELECT d.site_id, s.customer_id, d.id AS device_id
            FROM devices d
            JOIN sites s ON s.id = d.site_id
            WHERE d.zabbix_host_id = $1
            LIMIT 1
          `,
          [trigger.hosts[0]?.hostid ?? ""]
        );

        const device = siteLookup.rows[0];
        if (!device) {
          continue;
        }

        const severity = mapSeverity(trigger.priority);
        const dedupeKey = buildAlertFingerprint({
          hostId: trigger.hosts[0]?.hostid ?? "",
          triggerId: trigger.triggerid,
          severity,
          description: trigger.description
        });

        const shouldProcess = await reserveAlertDedup(
          dedupeKey,
          trigger.triggerid,
          Number(process.env.QUEUE_DEDUP_TTL_SECONDS ?? 300)
        );

        if (!shouldProcess) {
          await touchAlertDedup(
            dedupeKey,
            Number(process.env.QUEUE_DEDUP_TTL_SECONDS ?? 300)
          );
          continue;
        }

        await enqueueAlertJob(queueConfig, {
          externalId: trigger.triggerid,
          siteId: device.site_id,
          deviceId: device.device_id,
          customerId: device.customer_id,
          severity,
          description: trigger.description,
          dedupeKey,
          metadata: {
            zabbixHostId: trigger.hosts[0]?.hostid,
            zabbixHostName: trigger.hosts[0]?.name,
            lastChange: trigger.lastchange
          }
        });
      }
    } catch (error) {
      console.error("Zabbix poller iteration failed", error);
    }
  }, Number(process.env.ZABBIX_POLL_INTERVAL_MS ?? 30000));
}

export async function buildMonitoringApp(env: ServiceEnv) {
  process.env.DATABASE_URL = env.postgresUrl;
  process.env.REDIS_URL = env.redisUrl;
  process.env.INTERNAL_SERVICE_TOKEN = env.internalServiceToken;
  return createServiceApp(env, routes, {
    healthIndicators: [
      {
        name: "zabbix",
        check: async () => {
          if (!process.env.ZABBIX_URL) {
            return { status: "degraded", detail: "Zabbix not configured" };
          }

          await requestJson<{ result?: unknown }>(`${process.env.ZABBIX_URL}/api_jsonrpc.php`, {
            method: "POST",
            timeoutMs: Number(process.env.EXTERNAL_API_TIMEOUT_MS ?? 5000),
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "apiinfo.version",
              params: [],
              id: 1
            })
          });

          return { status: "ok" as const };
        }
      }
    ]
  });
}
