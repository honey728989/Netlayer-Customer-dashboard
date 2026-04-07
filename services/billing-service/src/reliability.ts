import {
  QueueConfig,
  addDeadLetterHandlers,
  buildJobOptions,
  createPlatformQueue,
  createWorker,
  DeadLetterPayload,
  query
} from "@netlayer/platform";

import { syncCustomerInvoices } from "./sync";

const webhookQueueName = "billing.zoho-webhooks";
const deadLetterQueueName = "billing.zoho-webhooks.dlq";

export interface ZohoWebhookJob {
  eventId: string;
  invoiceId: string;
  status: string;
  paymentStatus?: string;
  customerId?: string;
}

export async function enqueueWebhookJob(queueConfig: QueueConfig, job: ZohoWebhookJob) {
  const queue = createPlatformQueue(webhookQueueName, queueConfig);
  await queue.add("sync-webhook", job, buildJobOptions(job.eventId));
}

async function markWebhookRetry(eventId: string, attemptsMade: number, failedReason?: string) {
  await query(
    process.env.DATABASE_URL!,
    `
      UPDATE zoho_webhook_events
      SET
        processing_status = 'RETRYING',
        retry_count = $2,
        last_error = $3,
        next_retry_at = NOW() + make_interval(secs => $4),
        updated_at = NOW()
      WHERE event_id = $1
    `,
    [
      eventId,
      attemptsMade,
      failedReason ?? "Unknown error",
      Math.max(Number(process.env.QUEUE_BACKOFF_MS ?? 10000) / 1000, 1)
    ]
  );
}

async function markWebhookDeadLetter(payload: DeadLetterPayload) {
  const job = payload.payload as ZohoWebhookJob;
  await query(
    process.env.DATABASE_URL!,
    `
      UPDATE zoho_webhook_events
      SET
        processing_status = 'DEAD_LETTER',
        retry_count = $2,
        last_error = $3,
        next_retry_at = NULL,
        updated_at = NOW()
      WHERE event_id = $1
    `,
    [job.eventId, payload.attemptsMade, payload.failedReason ?? "Dead lettered"]
  );
}

export async function startWebhookWorker(queueConfig: QueueConfig) {
  const deadLetterQueue = createPlatformQueue(deadLetterQueueName, queueConfig);
  await addDeadLetterHandlers(webhookQueueName, queueConfig, deadLetterQueue, {
    onRetry: async ({ jobId, attemptsMade, failedReason }) => {
      if (!jobId) {
        return;
      }
      await markWebhookRetry(jobId, attemptsMade, failedReason);
    },
    onDeadLetter: markWebhookDeadLetter,
    onCompleted: async ({ jobId }) => {
      if (!jobId) {
        return;
      }
      await query(
        process.env.DATABASE_URL!,
        `
          UPDATE zoho_webhook_events
          SET
            processing_status = 'PROCESSED',
            processed_at = NOW(),
            retry_count = COALESCE(retry_count, 0),
            last_error = NULL,
            next_retry_at = NULL,
            updated_at = NOW()
          WHERE event_id = $1
        `,
        [jobId]
      );
    }
  });

  createWorker<ZohoWebhookJob>(webhookQueueName, queueConfig, async (job) => {
    await query(
      process.env.DATABASE_URL!,
      `
        UPDATE zoho_webhook_events
        SET processing_status = 'PROCESSING', retry_count = $2, updated_at = NOW()
        WHERE event_id = $1
      `,
      [job.data.eventId, job.attemptsMade]
    );

    await query(
      process.env.DATABASE_URL!,
      `
        UPDATE billing_invoices
        SET
          status = $2,
          payment_status = COALESCE($3, payment_status),
          updated_at = NOW()
        WHERE zoho_invoice_id = $1
      `,
      [job.data.invoiceId, job.data.status, job.data.paymentStatus ?? null]
    );

    const customerLookup = await query<{ customer_id: string }>(
      process.env.DATABASE_URL!,
      `
        SELECT customer_id
        FROM billing_invoices
        WHERE zoho_invoice_id = $1
        LIMIT 1
      `,
      [job.data.invoiceId]
    );

    const customerId = job.data.customerId ?? customerLookup.rows[0]?.customer_id;
    if (customerId) {
      await syncCustomerInvoices(customerId);
    }
  });
}
