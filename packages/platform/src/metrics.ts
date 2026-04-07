import client from "prom-client";

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: "netlayer_" });

export const httpRequestDuration = new client.Histogram({
  name: "netlayer_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["service", "method", "route", "status_code"],
  registers: [register]
});

export const queueJobCounter = new client.Counter({
  name: "netlayer_queue_jobs_total",
  help: "Queue jobs processed",
  labelNames: ["service", "queue", "status"],
  registers: [register]
});

export const queueRetryCounter = new client.Counter({
  name: "netlayer_queue_retries_total",
  help: "Queue job retries",
  labelNames: ["service", "queue"],
  registers: [register]
});

export const queueDeadLetterCounter = new client.Counter({
  name: "netlayer_queue_dead_letters_total",
  help: "Queue jobs moved to dead letter queue",
  labelNames: ["service", "queue", "dead_letter_queue"],
  registers: [register]
});

export const externalApiCounter = new client.Counter({
  name: "netlayer_external_api_requests_total",
  help: "External API requests",
  labelNames: ["service", "target", "status"],
  registers: [register]
});

export const rateLimitCounter = new client.Counter({
  name: "netlayer_rate_limit_hits_total",
  help: "Rate limit hits",
  labelNames: ["service", "scope"],
  registers: [register]
});

export const circuitBreakerState = new client.Gauge({
  name: "netlayer_circuit_breaker_state",
  help: "Circuit breaker state where 0=closed, 1=open, 0.5=half-open",
  labelNames: ["service", "target"],
  registers: [register]
});

export function getMetricsRegistry() {
  return register;
}
