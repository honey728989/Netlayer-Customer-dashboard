# Netlayer Frontend

Enterprise ISP Platform — multi-panel React monorepo.

## Panels

| Panel | Port | URL | Role |
|-------|------|-----|------|
| NOC / Admin | 3001 | `noc.netlayer.com` | `admin` |
| Customer Portal | 3002 | `portal.netlayer.com` | `customer` |
| Partner Portal | 3003 | `partner.netlayer.com` | `partner` |

## Tech Stack

- **React 18** + **Vite 5** (each panel is a separate Vite app)
- **Tailwind CSS 3** (custom design system)
- **React Router 6** (data router, lazy-loaded routes)
- **TanStack Query v5** (server state, caching, refetch)
- **Zustand v4** (UI state + WebSocket-fed stores)
- **Axios** (typed HTTP client, JWT interceptors, auto-refresh)
- **Recharts** (bandwidth charts)
- **Turborepo** (monorepo build orchestration)

## Prerequisites

```
Node >= 20
pnpm >= 9
```

## Quick Start

```bash
# 1. Install dependencies (all workspaces)
pnpm install

# 2. Configure environment
cp apps/noc/.env.example     apps/noc/.env.local
cp apps/portal/.env.example  apps/portal/.env.local
cp apps/partner/.env.example apps/partner/.env.local
# Edit each .env.local with your API/WS/Grafana/Zabbix URLs

# 3. Start all panels concurrently
pnpm dev

# Or start individually
pnpm dev:noc      # http://localhost:3001
pnpm dev:portal   # http://localhost:3002
pnpm dev:partner  # http://localhost:3003
```

## Folder Structure

```
netlayer/
├── apps/
│   ├── noc/                      # NOC / Admin panel
│   │   └── src/
│   │       ├── components/
│   │       │   ├── auth/         # RouteGuards
│   │       │   ├── alerts/       # AlertFeed, AlertItem
│   │       │   ├── charts/       # BandwidthChart
│   │       │   ├── layout/       # AppShell, Sidebar, TopBar
│   │       │   ├── sites/        # SiteDrawer
│   │       │   └── tickets/      # NewTicketModal
│   │       ├── hooks/
│   │       │   ├── useQueries.ts # All typed React Query hooks
│   │       │   └── useWebSockets.ts
│   │       ├── pages/
│   │       │   ├── LoginPage.tsx
│   │       │   └── noc/
│   │       │       ├── DashboardPage.tsx
│   │       │       ├── SitesPage.tsx
│   │       │       ├── TicketsPage.tsx
│   │       │       ├── AlertsPage.tsx
│   │       │       ├── MonitoringPage.tsx
│   │       │       ├── BandwidthPage.tsx
│   │       │       ├── CustomersPage.tsx
│   │       │       └── PartnersPage.tsx
│   │       ├── router/index.tsx  # Full router (lazy routes, guards)
│   │       ├── services/
│   │       │   └── queryClient.ts # QueryClient + key factories
│   │       └── store/
│   │           └── index.ts      # UIStore, AlertStore, BandwidthStore, SiteStatusStore
│   ├── portal/                   # Customer portal
│   │   └── src/pages/
│   │       ├── CustomerDashboard.tsx
│   │       ├── BillingPage.tsx
│   │       ├── CustomerSites.tsx
│   │       ├── CustomerTickets.tsx
│   │       └── SlaReportsPage.tsx
│   └── partner/                  # Partner portal
│       └── src/pages/
│           ├── PartnerDashboard.tsx
│           ├── PipelinePage.tsx  # Drag-and-drop Kanban
│           ├── ClientsPage.tsx
│           ├── CommissionsPage.tsx
│           └── OnboardingPage.tsx
│
└── packages/
    ├── api/                      # Axios client + typed API services
    │   └── src/
    │       ├── types.ts          # All domain types (Site, Alert, Ticket…)
    │       ├── client.ts         # Axios instance, JWT interceptors, auto-refresh
    │       ├── sites.ts
    │       ├── alerts.ts
    │       ├── tickets.ts
    │       └── resources.ts      # customers, partners, auth
    ├── auth/                     # Zustand auth store (persisted)
    │   └── src/authStore.ts
    └── ui/                       # Shared component library
        └── src/components/
            └── index.tsx         # KpiCard, DataTable, StatusPill, Card…
```

## Architecture Decisions

### State layers
| Layer | Tool | What it holds |
|-------|------|---------------|
| Server state | TanStack Query | API data, cache, loading/error |
| WebSocket state | Zustand (AlertStore, BandwidthStore) | Live alert feed, bandwidth history |
| UI state | Zustand (UIStore) | Sidebar collapse, drawer, theme |
| Auth state | Zustand (persisted) | JWT, user, role |

### Real-time data flow
```
WebSocket /ws/alerts        → useNocWebSockets() → useAlertStore
WebSocket /ws/bandwidth     → useNocWebSockets() → useBandwidthStore → BandwidthChart
WebSocket /ws/sites/status  → useNocWebSockets() → useSiteStatusStore
```

### Auth flow
```
POST /api/v1/auth/login
  → setAuth(user, accessToken, refreshToken)
  → navigate to ROLE_REDIRECT[user.role]

Axios request interceptor  → attaches Bearer token
Axios 401 interceptor      → calls /auth/refresh, retries original
On refresh failure         → clearAuth(), redirect /login
```

### Code-split strategy
All panel pages are `React.lazy()` + `Suspense`. Each route only loads its chunk when navigated to. The `@netlayer/ui`, `@netlayer/api`, `@netlayer/auth` packages are workspace dependencies resolved at build time — no network fetch.

## Build for production

```bash
# Build all panels
pnpm build

# Build individual panel
pnpm --filter @netlayer/noc build
```

## Docker

```bash
# Build + run all panels with nginx
docker-compose up --build
```

## Adding a new page

1. Create `apps/noc/src/pages/noc/MyPage.tsx`
2. Add to `src/router/index.tsx` as a lazy route
3. Add nav item to `src/components/layout/Sidebar.tsx`
4. Add API hook in `src/hooks/useQueries.ts` if needed

## Adding a shared component

1. Add to `packages/ui/src/components/index.tsx`
2. Import in any panel: `import { MyComponent } from '@netlayer/ui'`
