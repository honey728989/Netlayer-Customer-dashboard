import { loadEnv } from "@netlayer/platform";

import { buildBillingApp } from "./server";

async function main() {
  const env = loadEnv("billing-service", Number(process.env.BILLING_SERVICE_PORT ?? 4005));
  const app = await buildBillingApp(env);
  await app.listen({ host: "0.0.0.0", port: env.port });
}

void main();
