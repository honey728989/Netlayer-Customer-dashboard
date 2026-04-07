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
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    ...payload
  });
}
