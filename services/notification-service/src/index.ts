import { loadEnv } from "@netlayer/platform";

import { buildNotificationApp } from "./server";

async function main() {
  const env = loadEnv("notification-service", Number(process.env.NOTIFICATION_SERVICE_PORT ?? 4007));
  const app = await buildNotificationApp(env);
  await app.listen({ host: "0.0.0.0", port: env.port });
}

void main();
