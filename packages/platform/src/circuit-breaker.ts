import { circuitBreakerState, externalApiCounter } from "./metrics";

interface CircuitBreakerOptions {
  serviceName: string;
  target: string;
  failureThreshold: number;
  resetTimeoutMs: number;
}

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export class CircuitBreaker {
  private failures = 0;
  private state: CircuitState = "CLOSED";
  private nextAttemptAt = 0;

  constructor(private readonly options: CircuitBreakerOptions) {
    circuitBreakerState.set(
      { service: options.serviceName, target: options.target },
      0
    );
  }

  async execute<T>(operation: () => Promise<T>) {
    const now = Date.now();
    if (this.state === "OPEN" && now < this.nextAttemptAt) {
      externalApiCounter.inc({
        service: this.options.serviceName,
        target: this.options.target,
        status: "short_circuit"
      });
      throw new Error(`Circuit breaker open for ${this.options.target}`);
    }

    if (this.state === "OPEN" && now >= this.nextAttemptAt) {
      this.transition("HALF_OPEN");
    }

    try {
      const result = await operation();
      this.failures = 0;
      this.transition("CLOSED");
      externalApiCounter.inc({
        service: this.options.serviceName,
        target: this.options.target,
        status: "success"
      });
      return result;
    } catch (error) {
      this.failures += 1;
      externalApiCounter.inc({
        service: this.options.serviceName,
        target: this.options.target,
        status: "error"
      });

      if (this.failures >= this.options.failureThreshold) {
        this.nextAttemptAt = Date.now() + this.options.resetTimeoutMs;
        this.transition("OPEN");
      }

      throw error;
    }
  }

  snapshot() {
    return {
      state: this.state,
      failures: this.failures,
      nextAttemptAt: this.nextAttemptAt || null
    };
  }

  private transition(state: CircuitState) {
    this.state = state;
    circuitBreakerState.set(
      { service: this.options.serviceName, target: this.options.target },
      state === "OPEN" ? 1 : state === "HALF_OPEN" ? 0.5 : 0
    );
  }
}
