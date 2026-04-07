import fs from "node:fs";
import path from "node:path";

import { z } from "zod";

import { ServiceEnv } from "./types";

function findEnvFile(startDir: string) {
  let currentDir = startDir;

  while (true) {
    const candidate = path.join(currentDir, ".env");
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return undefined;
    }

    currentDir = parentDir;
  }
}

function loadDotEnv() {
  const envFile = findEnvFile(process.cwd()) ?? findEnvFile(path.resolve(__dirname, "../../.."));
  if (!envFile) {
    return;
  }

  const content = fs.readFileSync(envFile, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function buildDefaultEnv(port: number) {
  return {
    NODE_ENV: "development",
    LOG_LEVEL: "info",
    PORT: port,
    POSTGRES_HOST: "localhost",
    POSTGRES_PORT: 5432,
    POSTGRES_DB: "netlayer",
    POSTGRES_USER: "netlayer",
    POSTGRES_PASSWORD: "netlayer",
    REDIS_URL: "redis://localhost:6379",
    JWT_ACCESS_SECRET: "dev-access-secret",
    JWT_REFRESH_SECRET: "dev-refresh-secret",
    JWT_ISSUER: "netlayer",
    JWT_AUDIENCE: "netlayer-platform",
    RATE_LIMIT_MAX: 200,
    RATE_LIMIT_WINDOW: "1 minute",
    INTERNAL_SERVICE_TOKEN: "dev-internal-token",
    QUEUE_DEFAULT_ATTEMPTS: 5,
    QUEUE_BACKOFF_MS: 10000,
    QUEUE_DEDUP_TTL_SECONDS: 300,
    EXTERNAL_API_TIMEOUT_MS: 5000,
    EXTERNAL_API_CIRCUIT_BREAKER_FAILURES: 5,
    EXTERNAL_API_CIRCUIT_BREAKER_RESET_MS: 30000
  };
}

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  LOG_LEVEL: z.string().default("info"),
  PORT: z.coerce.number().positive(),
  POSTGRES_HOST: z.string().default("localhost"),
  POSTGRES_PORT: z.coerce.number().default(5432),
  POSTGRES_DB: z.string().default("netlayer"),
  POSTGRES_USER: z.string().default("netlayer"),
  POSTGRES_PASSWORD: z.string().default("netlayer"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_ACCESS_SECRET: z.string().default("dev-access-secret"),
  JWT_REFRESH_SECRET: z.string().default("dev-refresh-secret"),
  JWT_ISSUER: z.string().default("netlayer"),
  JWT_AUDIENCE: z.string().default("netlayer-platform"),
  RATE_LIMIT_MAX: z.coerce.number().default(200),
  RATE_LIMIT_WINDOW: z.string().default("1 minute"),
  INTERNAL_SERVICE_TOKEN: z.string().default("dev-internal-token"),
  QUEUE_DEFAULT_ATTEMPTS: z.coerce.number().default(5),
  QUEUE_BACKOFF_MS: z.coerce.number().default(10000),
  QUEUE_DEDUP_TTL_SECONDS: z.coerce.number().default(300),
  EXTERNAL_API_TIMEOUT_MS: z.coerce.number().default(5000),
  EXTERNAL_API_CIRCUIT_BREAKER_FAILURES: z.coerce.number().default(5),
  EXTERNAL_API_CIRCUIT_BREAKER_RESET_MS: z.coerce.number().default(30000)
});

export function loadEnv(serviceName: string, port: number): ServiceEnv {
  loadDotEnv();

  const envInput = {
    ...buildDefaultEnv(port),
    ...process.env,
    PORT: process.env.PORT ?? process.env.API_GATEWAY_PORT ?? String(port)
  };
  const parsed = envSchema.safeParse(envInput);
  const data = parsed.success ? parsed.data : envSchema.parse(buildDefaultEnv(port));

  return {
    nodeEnv: data.NODE_ENV,
    logLevel: data.LOG_LEVEL,
    serviceName,
    port: data.PORT,
    postgresUrl: `postgresql://${data.POSTGRES_USER}:${data.POSTGRES_PASSWORD}@${data.POSTGRES_HOST}:${data.POSTGRES_PORT}/${data.POSTGRES_DB}`,
    redisUrl: data.REDIS_URL,
    jwtAccessSecret: data.JWT_ACCESS_SECRET,
    jwtRefreshSecret: data.JWT_REFRESH_SECRET,
    jwtIssuer: data.JWT_ISSUER,
    jwtAudience: data.JWT_AUDIENCE,
    rateLimitMax: data.RATE_LIMIT_MAX,
    rateLimitWindow: data.RATE_LIMIT_WINDOW,
    internalServiceToken: data.INTERNAL_SERVICE_TOKEN,
    queueAttempts: data.QUEUE_DEFAULT_ATTEMPTS,
    queueBackoffMs: data.QUEUE_BACKOFF_MS,
    queueDedupTtlSeconds: data.QUEUE_DEDUP_TTL_SECONDS,
    externalApiTimeoutMs: data.EXTERNAL_API_TIMEOUT_MS,
    circuitBreakerFailures: data.EXTERNAL_API_CIRCUIT_BREAKER_FAILURES,
    circuitBreakerResetMs: data.EXTERNAL_API_CIRCUIT_BREAKER_RESET_MS
  };
}
