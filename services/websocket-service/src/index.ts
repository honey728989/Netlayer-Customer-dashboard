import { createServer } from "node:http";

import { EventBus, buildLogger, getMetricsRegistry, httpRequestDuration, loadEnv } from "@netlayer/platform";
import WebSocket, { WebSocketServer } from "ws";

type SocketTopic = "/ws/alerts" | "/ws/bandwidth" | "/ws/sites/status";

async function main() {
  const env = loadEnv("websocket-service", Number(process.env.WEBSOCKET_SERVICE_PORT ?? 4008));
  const logger = buildLogger(env.serviceName, env.logLevel);
  const server = createServer(async (req, res) => {
    const start = Date.now();

    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ service: env.serviceName, status: "ok" }));
      httpRequestDuration.observe(
        { service: env.serviceName, method: req.method ?? "GET", route: "/health", status_code: "200" },
        (Date.now() - start) / 1000
      );
      return;
    }

    if (req.url === "/metrics") {
      res.writeHead(200, { "content-type": getMetricsRegistry().contentType });
      res.end(await getMetricsRegistry().metrics());
      httpRequestDuration.observe(
        { service: env.serviceName, method: req.method ?? "GET", route: "/metrics", status_code: "200" },
        (Date.now() - start) / 1000
      );
      return;
    }

    res.writeHead(404);
    res.end();
  });
  const wss = new WebSocketServer({ noServer: true });
  const eventBus = new EventBus(env.redisUrl);
  const clients = new Map<SocketTopic, Set<WebSocket>>([
    ["/ws/alerts", new Set()],
    ["/ws/bandwidth", new Set()],
    ["/ws/sites/status", new Set()]
  ]);

  server.on("upgrade", (request, socket, head) => {
    const path = request.url as SocketTopic;
    if (!clients.has(path)) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (client: WebSocket) => {
      clients.get(path)!.add(client);
      client.on("close", () => clients.get(path)!.delete(client));
    });
  });

  const broadcast = (topic: SocketTopic, payload: unknown) => {
    for (const client of clients.get(topic) ?? []) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(payload));
      }
    }
  };

  await eventBus.subscribe("alerts", (payload: unknown) => broadcast("/ws/alerts", payload));
  await eventBus.subscribe("bandwidth", (payload: unknown) => broadcast("/ws/bandwidth", payload));
  await eventBus.subscribe("sites.status", (payload: unknown) =>
    broadcast("/ws/sites/status", payload)
  );

  server.listen(env.port, "0.0.0.0", () => {
    logger.info({ port: env.port }, "websocket service listening");
  });
}

void main();
