import { loadEnv } from "@netlayer/platform";

import { buildPartnerApp } from "./server";

async function main() {
  const env = loadEnv("partner-service", Number(process.env.PARTNER_SERVICE_PORT ?? 4006));
  const app = await buildPartnerApp(env);
  await app.listen({ host: "0.0.0.0", port: env.port });
}

void main();
