import pino from "pino";

import { buildLokiLine, parseLokiLabels, pushLokiLog } from "./logging";

export function buildLogger(name: string, level: string) {
  const lokiLabels = parseLokiLabels(process.env.LOKI_LABELS);
  return pino({
    name,
    level,
    redact: {
      paths: ["req.headers.authorization", "password", "token", "refreshToken"],
      censor: "[REDACTED]"
    },
    hooks: {
      logMethod(args, method) {
        const [firstArg, secondArg] = args;
        const message =
          typeof firstArg === "string"
            ? firstArg
            : typeof secondArg === "string"
              ? secondArg
              : undefined;
        if (typeof firstArg === "object" || message) {
          const payload =
            typeof firstArg === "object" && firstArg !== null
              ? (firstArg as Record<string, unknown>)
              : {};
          void pushLokiLog(
            process.env.LOKI_PUSH_URL,
            { app: name, ...lokiLabels },
            buildLokiLine({
              service: name,
              level,
              message,
              ...payload
            })
          );
        }
        method.apply(this, args);
      }
    }
  });
}
