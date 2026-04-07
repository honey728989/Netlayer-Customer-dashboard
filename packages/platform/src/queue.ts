import { Job, JobsOptions, Queue, QueueEvents, Worker } from "bullmq";
import Redis from "ioredis";

import { queueDeadLetterCounter, queueJobCounter, queueRetryCounter } from "./metrics";

export interface QueueConfig {
  redisUrl: string;
  serviceName: string;
  attempts: number;
  backoffMs: number;
}

export function createQueueConnection(redisUrl: string) {
  return new Redis(redisUrl, { maxRetriesPerRequest: null });
}

export function createPlatformQueue(queueName: string, config: QueueConfig) {
  return new Queue(queueName, {
    connection: createQueueConnection(config.redisUrl),
    defaultJobOptions: {
      attempts: config.attempts,
      backoff: {
        type: "exponential",
        delay: config.backoffMs
      },
      removeOnComplete: 1000,
      removeOnFail: 5000
    }
  });
}

export function createQueueEvents(queueName: string, redisUrl: string) {
  return new QueueEvents(queueName, {
    connection: createQueueConnection(redisUrl)
  });
}

export function createWorker<T>(
  queueName: string,
  config: QueueConfig,
  processor: (job: Job<T>) => Promise<unknown>
) {
  return new Worker<T>(queueName, processor, {
    connection: createQueueConnection(config.redisUrl)
  });
}

export interface DeadLetterPayload {
  originalQueue: string;
  failedReason?: string;
  payload: unknown;
  jobId: string;
  attemptsMade: number;
}

interface DeadLetterHandlers {
  onRetry?: (input: { jobId?: string; attemptsMade: number; failedReason?: string }) => Promise<void>;
  onDeadLetter?: (payload: DeadLetterPayload) => Promise<void>;
  onCompleted?: (input: { jobId?: string }) => Promise<void>;
}

export async function addDeadLetterHandlers(
  queueName: string,
  config: QueueConfig,
  deadLetterQueue: Queue,
  handlers?: DeadLetterHandlers
) {
  const events = createQueueEvents(queueName, config.redisUrl);
  const sourceQueue = createPlatformQueue(queueName, config);

  events.on("failed", async ({ jobId, failedReason }) => {
    queueJobCounter.inc({ service: config.serviceName, queue: queueName, status: "failed" });
    if (!jobId) {
      return;
    }

    const failedJob = await sourceQueue.getJob(jobId);
    if (!failedJob) {
      return;
    }

    const attempts = failedJob.opts.attempts ?? config.attempts;
    if (failedJob.attemptsMade < attempts) {
      queueRetryCounter.inc({ service: config.serviceName, queue: queueName });
      await handlers?.onRetry?.({
        jobId,
        attemptsMade: failedJob.attemptsMade,
        failedReason
      });
      return;
    }

    const payload: DeadLetterPayload = {
      originalQueue: queueName,
      failedReason,
      payload: failedJob.data,
      jobId,
      attemptsMade: failedJob.attemptsMade
    };
    await deadLetterQueue.add(`${queueName}-dlq`, {
      ...payload
    } as Record<string, unknown>);
    queueDeadLetterCounter.inc({
      service: config.serviceName,
      queue: queueName,
      dead_letter_queue: deadLetterQueue.name
    });
    await handlers?.onDeadLetter?.(payload);
  });

  events.on("completed", async ({ jobId }) => {
    queueJobCounter.inc({ service: config.serviceName, queue: queueName, status: "completed" });
    await handlers?.onCompleted?.({ jobId });
  });

  return events;
}

export function buildJobOptions(jobId?: string): JobsOptions {
  return {
    jobId
  };
}
