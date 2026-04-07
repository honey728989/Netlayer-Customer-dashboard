import { CircuitBreaker, requestJson } from "@netlayer/platform";

interface TokenResponse {
  access_token: string;
}

export class ZohoBooksClient {
  private accessToken?: string;
  private readonly breaker = new CircuitBreaker({
    serviceName: "billing-service",
    target: "zoho-books",
    failureThreshold: Number(process.env.EXTERNAL_API_CIRCUIT_BREAKER_FAILURES ?? 5),
    resetTimeoutMs: Number(process.env.EXTERNAL_API_CIRCUIT_BREAKER_RESET_MS ?? 30000)
  });

  async authenticate() {
    const tokenUrl = `https://accounts.zoho.in/oauth/v2/token?refresh_token=${process.env.ZOHO_BOOKS_REFRESH_TOKEN}&client_id=${process.env.ZOHO_BOOKS_CLIENT_ID}&client_secret=${process.env.ZOHO_BOOKS_CLIENT_SECRET}&grant_type=refresh_token`;
    const json = await this.breaker.execute(async () => {
      const response = await fetch(tokenUrl, {
        method: "POST",
        signal: AbortSignal.timeout(Number(process.env.EXTERNAL_API_TIMEOUT_MS ?? 5000))
      });
      if (!response.ok) {
        throw new Error(`Unable to refresh Zoho Books token: ${await response.text()}`);
      }
      return (await response.json()) as TokenResponse;
    });
    this.accessToken = json.access_token;
  }

  private async api<T>(path: string, init?: { method?: string; body?: string }) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    try {
      return await this.breaker.execute(() =>
        requestJson<T>(
          `${process.env.ZOHO_BOOKS_BASE_URL}${path}&organization_id=${process.env.ZOHO_BOOKS_ORGANIZATION_ID}`,
          {
            ...init,
            timeoutMs: Number(process.env.EXTERNAL_API_TIMEOUT_MS ?? 5000),
            headers: {
              Authorization: `Zoho-oauthtoken ${this.accessToken}`,
              "content-type": "application/json"
            }
          }
        )
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes("401")) {
        this.accessToken = undefined;
        await this.authenticate();
        return this.breaker.execute(() =>
          requestJson<T>(
            `${process.env.ZOHO_BOOKS_BASE_URL}${path}&organization_id=${process.env.ZOHO_BOOKS_ORGANIZATION_ID}`,
            {
              ...init,
              timeoutMs: Number(process.env.EXTERNAL_API_TIMEOUT_MS ?? 5000),
              headers: {
                Authorization: `Zoho-oauthtoken ${this.accessToken}`,
                "content-type": "application/json"
              }
            }
          )
        );
      }

      throw error;
    }
  }

  createInvoice(payload: Record<string, unknown>) {
    return this.api<{ invoice: { invoice_id: string; status: string } }>("/invoices?", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  listInvoices(customerZohoId: string) {
    return this.api<{ invoices: Array<Record<string, unknown>> }>(
      `/invoices?customer_id=${customerZohoId}`
    );
  }
}
