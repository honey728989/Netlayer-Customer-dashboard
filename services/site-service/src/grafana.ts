import crypto from "node:crypto";

export function buildCustomerDashboardUrl(customerId: string, dashboardUid: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + 300;
  const payload = `${customerId}:${dashboardUid}:${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", process.env.GRAFANA_EMBED_SIGNING_SECRET!)
    .update(payload)
    .digest("hex");

  const url = new URL(`/d-solo/${dashboardUid}/customer-overview`, process.env.GRAFANA_BASE_URL);
  url.searchParams.set("orgId", "1");
  url.searchParams.set("from", "now-24h");
  url.searchParams.set("to", "now");
  url.searchParams.set("var-customerId", customerId);
  url.searchParams.set("embedSig", signature);
  url.searchParams.set("embedExp", String(expiresAt));

  return url.toString();
}

export function buildSiteDashboardUrl(customerId: string, siteId: string, dashboardUid: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + 300;
  const payload = `${customerId}:${siteId}:${dashboardUid}:${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", process.env.GRAFANA_EMBED_SIGNING_SECRET!)
    .update(payload)
    .digest("hex");

  const url = new URL(`/d-solo/${dashboardUid}/site-overview`, process.env.GRAFANA_BASE_URL);
  url.searchParams.set("orgId", "1");
  url.searchParams.set("from", "now-24h");
  url.searchParams.set("to", "now");
  url.searchParams.set("var-customerId", customerId);
  url.searchParams.set("var-siteId", siteId);
  url.searchParams.set("embedSig", signature);
  url.searchParams.set("embedExp", String(expiresAt));

  return url.toString();
}
