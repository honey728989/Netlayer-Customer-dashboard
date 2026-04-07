import { loadEnv } from "@netlayer/platform";

import { buildMonitoringApp, startZabbixPoller } from "./server";

async function main() {
  const env = loadEnv("monitoring-service", Number(process.env.MONITORING_SERVICE_PORT ?? 4003));
  const app = await buildMonitoringApp(env);
  await app.listen({ host: "0.0.0.0", port: env.port });
  void startZabbixPoller();
}

void main();
