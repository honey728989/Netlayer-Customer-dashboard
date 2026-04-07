# Netlayer Backend Platform

Production-oriented backend monorepo for the Netlayer enterprise ISP platform. The repository contains:

- Microservices for auth, sites, monitoring, tickets, billing, partners, notifications, websockets, and the API gateway
- PostgreSQL schema for the operational data model
- Redis-backed event fanout for realtime delivery
- Zabbix, Grafana, and Zoho Books integration clients
- Docker Compose, Kubernetes manifests, NGINX reverse proxy, and GitHub Actions CI/CD

## Services

- `@netlayer/api-gateway`
- `@netlayer/auth-service`
- `@netlayer/site-service`
- `@netlayer/monitoring-service`
- `@netlayer/ticket-service`
- `@netlayer/billing-service`
- `@netlayer/partner-service`
- `@netlayer/notification-service`
- `@netlayer/websocket-service`

## Folder Structure

```text
.
|-- packages/
|   `-- platform/                Shared config, auth, DB, events, server bootstrap
|-- services/
|   |-- api-gateway/             External API entrypoint
|   |-- auth-service/            JWT login and identity context
|   |-- site-service/            Sites, customers, traffic, Grafana embed URLs
|   |-- monitoring-service/      Zabbix ingestion and alert normalization
|   |-- ticket-service/          SLA-aware ticket lifecycle
|   |-- billing-service/         Zoho Books invoices and payment sync
|   |-- partner-service/         Partner revenue and commission APIs
|   |-- notification-service/    Email, SMS, and WhatsApp delivery
|   `-- websocket-service/       Realtime fanout for alerts, bandwidth, site status
|-- infra/
|   |-- docker/                  Reusable Node service Dockerfile
|   |-- nginx/                   Reverse proxy and websocket config
|   |-- postgres/init/           PostgreSQL schema and seed scripts
|   `-- k8s/                     Kubernetes manifests
`-- .github/workflows/           CI/CD pipeline
```

## Quick Start

1. Copy `.env.example` to `.env` and fill in integration credentials.
2. Run `docker compose up --build`.
3. Access the API through `https://localhost`.
4. Run `npm run typecheck` or `npm run build` locally for service validation.

## API Surface

The API gateway exposes:

- `GET /api/v1/sites`
- `GET /api/v1/sites/:id`
- `GET /api/v1/sites/:id/traffic`
- `GET /api/v1/alerts`
- `POST /api/v1/alerts/:id/ack`
- `GET /api/v1/tickets`
- `POST /api/v1/tickets`
- `PATCH /api/v1/tickets/:id`
- `GET /api/v1/customers`
- `GET /api/v1/customers/:id/sla`
- `GET /api/v1/customers/:id/billing`
- `GET /api/v1/partners`
- `GET /api/v1/partners/:id/revenue`
- `GET /api/v1/partners/:id/commission`

Realtime endpoints are served by the websocket service:

- `/ws/alerts`
- `/ws/bandwidth`
- `/ws/sites/status`

## Deployment Steps

1. Build and push container images through GitHub Actions or manually with `docker build`.
2. Apply `infra/k8s/netlayer-platform.yaml` followed by `infra/k8s/netlayer-services.yaml`.
3. Configure TLS certificates on the ingress controller or terminate TLS at NGINX/load balancer.
4. Point the frontend to the gateway base URL and websocket origin.
5. Populate Zabbix, Zoho Books, Grafana, SMTP, and Twilio secrets before enabling production traffic.
