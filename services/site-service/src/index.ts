import { loadEnv } from "@netlayer/platform";

import { buildSiteApp } from "./server";

async function main() {
  const env = loadEnv("site-service", Number(process.env.SITE_SERVICE_PORT ?? 4002));
  const app = await buildSiteApp(env);
  await app.listen({ host: "0.0.0.0", port: env.port });
}

void main();
