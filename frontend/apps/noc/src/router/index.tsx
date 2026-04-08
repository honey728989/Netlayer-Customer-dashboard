import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth, RequireRole, RoleRedirect } from '@/components/auth/RouteGuards'
import { LoginPage } from '@/pages/LoginPage'
import { PageLoader } from '@netlayer/ui'

// ─── Lazy-loaded NOC pages ────────────────────────────────────────────────────

const DashboardPage  = lazy(() => import('@/pages/noc/DashboardPage').then(m => ({ default: m.DashboardPage })))
const SitesPage      = lazy(() => import('@/pages/noc/SitesPage').then(m => ({ default: m.SitesPage })))
const TicketsPage    = lazy(() => import('@/pages/noc/TicketsPage').then(m => ({ default: m.TicketsPage })))
const AlertsPage     = lazy(() => import('@/pages/noc/AlertsPage').then(m => ({ default: m.AlertsPage })))
const CustomersPage  = lazy(() => import('@/pages/noc/CustomersPage').then(m => ({ default: m.CustomersPage })))
const PartnersPage   = lazy(() => import('@/pages/noc/PartnersPage').then(m => ({ default: m.PartnersPage })))
const BandwidthPage  = lazy(() => import('@/pages/noc/BandwidthPage').then(m => ({ default: m.BandwidthPage })))
const MonitoringPage = lazy(() => import('@/pages/noc/MonitoringPage').then(m => ({ default: m.MonitoringPage })))
const ReportsPage    = lazy(() => import('@/pages/noc/ReportsPage').then(m => ({ default: m.ReportsPage })))

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

const router = createBrowserRouter([
  // Root redirect
  { path: '/', element: <RoleRedirect /> },

  // Login — public
  { path: '/login', element: <LoginPage /> },

  // ── NOC / Admin Panel ─────────────────────────────────────────────────────
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole roles={['admin']} redirectTo="/login" />,
        children: [
          {
            path: '/noc',
            element: <AppShell />,
            children: [
              { index: true,        element: <Lazy><DashboardPage /></Lazy> },
              { path: 'sites',      element: <Lazy><SitesPage /></Lazy> },
              { path: 'monitoring', element: <Lazy><MonitoringPage /></Lazy> },
              { path: 'alerts',     element: <Lazy><AlertsPage /></Lazy> },
              { path: 'tickets',    element: <Lazy><TicketsPage /></Lazy> },
              { path: 'bandwidth',  element: <Lazy><BandwidthPage /></Lazy> },
              { path: 'reports',    element: <Lazy><ReportsPage /></Lazy> },
              { path: 'customers',  element: <Lazy><CustomersPage /></Lazy> },
              { path: 'partners',   element: <Lazy><PartnersPage /></Lazy> },
            ],
          },
        ],
      },
    ],
  },

  // 404
  {
    path: '*',
    element: (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-base text-center">
        <p className="font-mono text-4xl font-bold text-brand">404</p>
        <p className="text-sm text-muted">Page not found</p>
        <a href="/" className="btn-ghost mt-2">← Go home</a>
      </div>
    ),
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
