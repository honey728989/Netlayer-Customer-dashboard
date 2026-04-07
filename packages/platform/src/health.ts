export interface HealthIndicator {
  name: string;
  check: () => Promise<{ status: "ok" | "degraded"; detail?: string }>;
}

export function okIndicator(name: string): HealthIndicator {
  return {
    name,
    check: async () => ({ status: "ok" })
  };
}

export async function runHealthChecks(indicators: HealthIndicator[]) {
  const results = await Promise.all(
    indicators.map(async (indicator) => {
      try {
        const result = await indicator.check();
        return { name: indicator.name, ...result };
      } catch (error) {
        return {
          name: indicator.name,
          status: "degraded" as const,
          detail: error instanceof Error ? error.message : "Unknown error"
        };
      }
    })
  );

  const overall = results.every((result) => result.status === "ok") ? "ok" : "degraded";
  return { status: overall, checks: results };
}
