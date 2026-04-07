import { loadEnv } from "@netlayer/platform";

import { buildTicketApp } from "./server";

async function main() {
  const env = loadEnv("ticket-service", Number(process.env.TICKET_SERVICE_PORT ?? 4004));
  const app = await buildTicketApp(env);
  await app.listen({ host: "0.0.0.0", port: env.port });
}

void main();
