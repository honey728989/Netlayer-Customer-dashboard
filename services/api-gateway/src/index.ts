import { loadEnv } from "@netlayer/platform";

import { buildGatewayApp } from "./server";

async function main() {
  const env = loadEnv("api-gateway", Number(process.env.API_GATEWAY_PORT ?? 8000));
  const app = await buildGatewayApp(env);
  await app.listen({ host: "0.0.0.0", port: env.port });
}

void main();
