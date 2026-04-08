import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth, RequireRole, RoleRedirect } from '@/components/auth/RouteGuards'
import { LoginPage } from '@/pages/LoginPage'
import { SharedPlaceholderPage } from '@/pages/SharedPlaceholderPage'
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
const CustomerDashboardPage = lazy(() => import('../../../portal/src/pages/CustomerDashboard').then(m => ({ default: m.CustomerDashboard })))
const CustomerHeatMapPage = lazy(() => import('@/pages/portal/CustomerHeatMapPage').then(m => ({ default: m.CustomerHeatMapPage })))
const CustomerServicesPage = lazy(() => import('@/pages/portal/CustomerServicesPage').then(m => ({ default: m.CustomerServicesPage })))
const CustomerSitesPage = lazy(() => import('../../../portal/src/pages/CustomerSites').then(m => ({ default: m.CustomerSites })))
const CustomerSiteDetailPage = lazy(() => import('@/pages/portal/CustomerSiteDetailPage').then(m => ({ default: m.CustomerSiteDetailPage })))
const CustomerTicketsPage = lazy(() => import('../../../portal/src/pages/CustomerTickets').then(m => ({ default: m.CustomerTickets })))
const CustomerTicketDetailPage = lazy(() => import('@/pages/portal/CustomerTicketDetailPage').then(m => ({ default: m.CustomerTicketDetailPage })))
const CustomerRaiseTicketPage = lazy(() => import('@/pages/portal/CustomerRaiseTicketPage').then(m => ({ default: m.CustomerRaiseTicketPage })))
const CustomerBillingPage = lazy(() => import('../../../portal/src/pages/BillingPage').then(m => ({ default: m.BillingPage })))
const CustomerReportsPage = lazy(() => import('../../../portal/src/pages/SlaReportsPage').then(m => ({ default: m.SlaReportsPage })))
const CustomerFeasibilityPage = lazy(() => import('@/pages/portal/CustomerFeasibilityPage').then(m => ({ default: m.CustomerFeasibilityPage })))
const CustomerNotificationsPage = lazy(() => import('@/pages/portal/CustomerNotificationsPage').then(m => ({ default: m.CustomerNotificationsPage })))
const CustomerAccessPage = lazy(() => import('@/pages/portal/CustomerAccessPage').then(m => ({ default: m.CustomerAccessPage })))
const PartnerDashboardPage = lazy(() => import('../../../partner/src/pages/PartnerDashboard').then(m => ({ default: m.PartnerDashboard })))
const PartnerPipelinePage = lazy(() => import('../../../partner/src/pages/PipelinePage').then(m => ({ default: m.PipelinePage })))
const PartnerClientsPage = lazy(() => import('../../../partner/src/pages/ClientsPage').then(m => ({ default: m.ClientsPage })))
const PartnerCommissionsPage = lazy(() => import('../../../partner/src/pages/CommissionsPage').then(m => ({ default: m.CommissionsPage })))
const PartnerOnboardingPage = lazy(() => import('../../../partner/src/pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })))

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
              {
                path: 'settings',
                element: (
                  <SharedPlaceholderPage
                    title="Settings Workspace"
                    description="User, integration, and policy settings are being finalized for the telecom admin experience."
                    primaryHref="/noc"
                    primaryLabel="Back to Dashboard"
                  />
                ),
              },
            ],
          },
        ],
      },
      {
        element: <RequireRole roles={['customer']} redirectTo="/" />,
        children: [
          {
            path: '/portal',
            element: <AppShell />,
            children: [
              { index: true, element: <Lazy><CustomerDashboardPage /></Lazy> },
              { path: 'heatmap', element: <Lazy><CustomerHeatMapPage /></Lazy> },
              { path: 'sites', element: <Lazy><CustomerSitesPage /></Lazy> },
              { path: 'sites/:siteId', element: <Lazy><CustomerSiteDetailPage /></Lazy> },
              { path: 'services', element: <Lazy><CustomerServicesPage /></Lazy> },
              { path: 'tickets', element: <Lazy><CustomerTicketsPage /></Lazy> },
              { path: 'tickets/:ticketId', element: <Lazy><CustomerTicketDetailPage /></Lazy> },
              { path: 'tickets/new', element: <Lazy><CustomerRaiseTicketPage /></Lazy> },
              { path: 'notifications', element: <Lazy><CustomerNotificationsPage /></Lazy> },
              { path: 'access', element: <Lazy><CustomerAccessPage /></Lazy> },
              { path: 'billing', element: <Lazy><CustomerBillingPage /></Lazy> },
              { path: 'feasibility', element: <Lazy><CustomerFeasibilityPage /></Lazy> },
              { path: 'reports/sla', element: <Lazy><CustomerReportsPage /></Lazy> },
            ],
          },
        ],
      },
      {
        element: <RequireRole roles={['partner']} redirectTo="/" />,
        children: [
          {
            path: '/partner',
            element: <AppShell />,
            children: [
              { index: true, element: <Lazy><PartnerDashboardPage /></Lazy> },
              { path: 'pipeline', element: <Lazy><PartnerPipelinePage /></Lazy> },
              { path: 'clients', element: <Lazy><PartnerClientsPage /></Lazy> },
              { path: 'commissions', element: <Lazy><PartnerCommissionsPage /></Lazy> },
              { path: 'onboarding', element: <Lazy><PartnerOnboardingPage /></Lazy> },
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
