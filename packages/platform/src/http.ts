export async function requestJson<T>(
  input: string,
  init?: RequestInit & { headers?: Record<string, string>; timeoutMs?: number }
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init?.timeoutMs ?? 10_000);
  const response = await fetch(input, {
    ...init,
    signal: controller.signal,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  clearTimeout(timeout);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status} calling ${input}: ${body}`);
  }

  return (await response.json()) as T;
}
