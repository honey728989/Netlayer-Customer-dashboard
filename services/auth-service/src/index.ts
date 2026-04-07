import { loadEnv } from "@netlayer/platform";

import { buildAuthApp } from "./server";

async function main() {
  const env = loadEnv("auth-service", Number(process.env.AUTH_SERVICE_PORT ?? 4001));
  const app = await buildAuthApp(env);
  await app.listen({ host: "0.0.0.0", port: env.port });
}

void main();
