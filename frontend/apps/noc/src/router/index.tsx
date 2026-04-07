import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth, RequireRole, RoleRedirect } from '@/components/auth/RouteGuards'
import { LoginPage } from '@/pages/LoginPage'
import { PageLoader } from '@netlayer/ui'

// ─── Lazy-loaded pages ────────────────────────────────────────────────────────

const DashboardPage    = lazy(() => import('@/pages/noc/DashboardPage').then(m => ({ default: m.DashboardPage })))
const SitesPage        = lazy(() => import('@/pages/noc/SitesPage').then(m => ({ default: m.SitesPage })))
const TicketsPage      = lazy(() => import('@/pages/noc/TicketsPage').then(m => ({ default: m.TicketsPage })))
const AlertsPage       = lazy(() => import('@/pages/noc/AlertsPage').then(m => ({ default: m.AlertsPage })))
const CustomersPage    = lazy(() => import('@/pages/noc/CustomersPage').then(m => ({ default: m.CustomersPage })))
const PartnersPage     = lazy(() => import('@/pages/noc/PartnersPage').then(m => ({ default: m.PartnersPage })))
const BandwidthPage    = lazy(() => import('@/pages/noc/BandwidthPage').then(m => ({ default: m.BandwidthPage })))
const MonitoringPage   = lazy(() => import('@/pages/noc/MonitoringPage').then(m => ({ default: m.MonitoringPage })))
const ReportsPage      = lazy(() => import('@/pages/noc/ReportsPage').then(m => ({ default: m.ReportsPage })))

// Customer panel
const CustomerDashboard = lazy(() => import('../../../portal/src/pages/CustomerDashboard').then(m => ({ default: m.CustomerDashboard })))
const CustomerSites     = lazy(() => import('../../../portal/src/pages/CustomerSites').then(m => ({ default: m.CustomerSites })))
const CustomerTickets   = lazy(() => import('../../../portal/src/pages/CustomerTickets').then(m => ({ default: m.CustomerTickets })))
const BillingPage       = lazy(() => import('../../../portal/src/pages/BillingPage').then(m => ({ default: m.BillingPage })))
const SlaReportsPage    = lazy(() => import('../../../portal/src/pages/SlaReportsPage').then(m => ({ default: m.SlaReportsPage })))

// Partner panel
const PartnerDashboard  = lazy(() => import('../../../partner/src/pages/PartnerDashboard').then(m => ({ default: m.PartnerDashboard })))
const PipelinePage      = lazy(() => import('../../../partner/src/pages/PipelinePage').then(m => ({ default: m.PipelinePage })))
const ClientsPage       = lazy(() => import('../../../partner/src/pages/ClientsPage').then(m => ({ default: m.ClientsPage })))
const CommissionsPage   = lazy(() => import('../../../partner/src/pages/CommissionsPage').then(m => ({ default: m.CommissionsPage })))
const OnboardingPage    = lazy(() => import('../../../partner/src/pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })))

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
              { index: true,              element: <Lazy><DashboardPage /></Lazy> },
              { path: 'sites',            element: <Lazy><SitesPage /></Lazy> },
              { path: 'monitoring',       element: <Lazy><MonitoringPage /></Lazy> },
              { path: 'alerts',           element: <Lazy><AlertsPage /></Lazy> },
              { path: 'tickets',          element: <Lazy><TicketsPage /></Lazy> },
              { path: 'bandwidth',        element: <Lazy><BandwidthPage /></Lazy> },
              { path: 'reports',          element: <Lazy><ReportsPage /></Lazy> },
              { path: 'customers',        element: <Lazy><CustomersPage /></Lazy> },
              { path: 'partners',         element: <Lazy><PartnersPage /></Lazy> },
            ],
          },
        ],
      },

      // ── Customer Portal ─────────────────────────────────────────────────
      {
        element: <RequireRole roles={['customer']} redirectTo="/login" />,
        children: [
          {
            path: '/portal',
            element: <AppShell />,
            children: [
              { index: true,              element: <Lazy><CustomerDashboard /></Lazy> },
              { path: 'sites',            element: <Lazy><CustomerSites /></Lazy> },
              { path: 'tickets',          element: <Lazy><CustomerTickets /></Lazy> },
              { path: 'billing',          element: <Lazy><BillingPage /></Lazy> },
              { path: 'reports/sla',      element: <Lazy><SlaReportsPage /></Lazy> },
            ],
          },
        ],
      },

      // ── Partner Portal ──────────────────────────────────────────────────
      {
        element: <RequireRole roles={['partner']} redirectTo="/login" />,
        children: [
          {
            path: '/partner',
            element: <AppShell />,
            children: [
              { index: true,              element: <Lazy><PartnerDashboard /></Lazy> },
              { path: 'pipeline',         element: <Lazy><PipelinePage /></Lazy> },
              { path: 'clients',          element: <Lazy><ClientsPage /></Lazy> },
              { path: 'commissions',      element: <Lazy><CommissionsPage /></Lazy> },
              { path: 'onboarding',       element: <Lazy><OnboardingPage /></Lazy> },
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
