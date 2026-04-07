export function parseLokiLabels(input: string | undefined) {
  const pairs = (input ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.split("="));

  return Object.fromEntries(pairs.filter(([key, value]) => key && value));
}

export async function pushLokiLog(
  pushUrl: string | undefined,
  labels: Record<string, string>,
  line: string
) {
  if (!pushUrl) {
    return;
  }

  await fetch(pushUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      streams: [
        {
          stream: labels,
          values: [[`${BigInt(Date.now()) * 1000000n}`, line]]
        }
      ]
    })
  }).catch(() => undefined);
}

export function buildLokiLine(payload: Record<string, unknown>) {
  const seen = new WeakSet<object>();

  return JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      ...payload
    },
    (_key, value) => {
      if (typeof value === "bigint") {
        return value.toString();
      }

      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
      }

      return value;
    }
  );
}
