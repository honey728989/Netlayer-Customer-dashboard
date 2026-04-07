import crypto from "node:crypto";
import type { Job } from "bullmq";

import {
  CircuitBreaker,
  EventBus,
  QueueConfig,
  addDeadLetterHandlers,
  buildJobOptions,
  createPlatformQueue,
  createWorker,
  query,
  requestJson
} from "@netlayer/platform";

const alertQueueName = "monitoring.alerts";
const deadLetterQueueName = "monitoring.alerts.dlq";

export interface AlertJob {
  externalId: string;
  siteId: string;
  deviceId: string;
  customerId: string;
  severity: "P1" | "P2" | "P3" | "P4";
  description: string;
  metadata: Record<string, unknown>;
  dedupeKey: string;
}

export function buildAlertFingerprint(input: {
  hostId: string;
  triggerId: string;
  severity: string;
  description: string;
}) {
  return crypto
    .createHash("sha256")
    .update(`${input.hostId}:${input.triggerId}:${input.severity}:${input.description}`)
    .digest("hex");
}

export async function reserveAlertDedup(
  fingerprint: string,
  externalId: string,
  ttlSeconds: number
) {
  const result = await query<{ should_process: boolean }>(
    process.env.DATABASE_URL!,
    `
      INSERT INTO alert_deduplication (dedupe_key, external_id, first_seen_at, last_seen_at, suppressed_count, expires_at)
      VALUES ($1, $2, NOW(), NOW(), 0, NOW() + make_interval(secs => $3))
      ON CONFLICT (dedupe_key) DO UPDATE
      SET
        last_seen_at = NOW(),
        suppressed_count = alert_deduplication.suppressed_count + 1,
        expires_at = NOW() + make_interval(secs => $3)
      RETURNING (xmax = 0) AS should_process
    `,
    [fingerprint, externalId, ttlSeconds]
  );

  return result.rows[0]?.should_process ?? false;
}

export async function touchAlertDedup(fingerprint: string, ttlSeconds: number) {
  await query(
    process.env.DATABASE_URL!,
    `
      UPDATE alert_deduplication
      SET expires_at = NOW() + make_interval(secs => $2), last_seen_at = NOW()
      WHERE dedupe_key = $1
    `,
    [fingerprint, ttlSeconds]
  );
}

export async function enqueueAlertJob(queueConfig: QueueConfig, job: AlertJob) {
  const queue = createPlatformQueue(alertQueueName, queueConfig);
  await queue.add("process-alert", job, buildJobOptions(job.externalId));
}

export async function startAlertWorker(queueConfig: QueueConfig, eventBus: EventBus) {
  const deadLetterQueue = createPlatformQueue(deadLetterQueueName, queueConfig);
  await addDeadLetterHandlers(alertQueueName, queueConfig, deadLetterQueue);

  createWorker<AlertJob>(alertQueueName, queueConfig, async (job: Job<AlertJob>) => {
    const alert = await query<{ id: string; severity: string }>(
      process.env.DATABASE_URL!,
      `
        INSERT INTO alerts (
          external_id,
          site_id,
          device_id,
          severity,
          status,
          source,
          message,
          metadata
        )
        VALUES ($1, $2, $3, $4, 'OPEN', 'ZABBIX', $5, $6::jsonb)
        ON CONFLICT (external_id) DO UPDATE
        SET
          status = 'OPEN',
          message = EXCLUDED.message,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING id, severity
      `,
      [
        job.data.externalId,
        job.data.siteId,
        job.data.deviceId,
        job.data.severity,
        job.data.description,
        JSON.stringify(job.data.metadata)
      ]
    );

    await eventBus.publish("alerts", {
      type: "alert.opened",
      payload: alert.rows[0]
    });

    if (job.data.severity === "P1" || job.data.severity === "P2") {
      await requestJson(`${process.env.TICKET_SERVICE_URL}/internal/tickets/auto-create`, {
        method: "POST",
        headers: {
          "x-internal-token": process.env.INTERNAL_SERVICE_TOKEN!
        },
        timeoutMs: Number(process.env.EXTERNAL_API_TIMEOUT_MS ?? 5000),
        body: JSON.stringify({
          customerId: job.data.customerId,
          siteId: job.data.siteId,
          alertId: alert.rows[0].id,
          title: job.data.description,
          description: `Auto-created from Zabbix trigger ${job.data.externalId}`,
          priority: job.data.severity
        })
      });
    }
  });
}

export function buildZabbixBreaker() {
  return new CircuitBreaker({
    serviceName: "monitoring-service",
    target: "zabbix",
    failureThreshold: Number(process.env.EXTERNAL_API_CIRCUIT_BREAKER_FAILURES ?? 5),
    resetTimeoutMs: Number(process.env.EXTERNAL_API_CIRCUIT_BREAKER_RESET_MS ?? 30000)
  });
}
