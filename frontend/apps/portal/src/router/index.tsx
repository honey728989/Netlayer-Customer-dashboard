import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { PageLoader } from '@netlayer/ui'
import { LoginPage } from '../../../noc/src/pages/LoginPage'
import { AppShell } from '../../../noc/src/components/layout/AppShell'
import { RequireAuth, RequireRole, RoleRedirect } from '../../../noc/src/components/auth/RouteGuards'

const CustomerDashboard = lazy(() => import('../pages/CustomerDashboard').then(m => ({ default: m.CustomerDashboard })))
const CustomerSites     = lazy(() => import('../pages/CustomerSites').then(m => ({ default: m.CustomerSites })))
const CustomerTickets   = lazy(() => import('../pages/CustomerTickets').then(m => ({ default: m.CustomerTickets })))
const BillingPage       = lazy(() => import('../pages/BillingPage').then(m => ({ default: m.BillingPage })))
const SlaReportsPage    = lazy(() => import('../pages/SlaReportsPage').then(m => ({ default: m.SlaReportsPage })))

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

const router = createBrowserRouter([
  { path: '/', element: <RoleRedirect /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole roles={['customer']} redirectTo="/login" />,
        children: [
          {
            path: '/portal',
            element: <AppShell />,
            children: [
              { index: true,         element: <Lazy><CustomerDashboard /></Lazy> },
              { path: 'sites',       element: <Lazy><CustomerSites /></Lazy> },
              { path: 'tickets',     element: <Lazy><CustomerTickets /></Lazy> },
              { path: 'billing',     element: <Lazy><BillingPage /></Lazy> },
              { path: 'reports/sla', element: <Lazy><SlaReportsPage /></Lazy> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <div className="flex h-screen items-center justify-center bg-base"><p className="font-mono text-brand">404 — Not found</p></div> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
