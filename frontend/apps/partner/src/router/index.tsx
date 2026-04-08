import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { PageLoader } from '@netlayer/ui'
import { LoginPage } from '../../../noc/src/pages/LoginPage'
import { AppShell } from '../../../noc/src/components/layout/AppShell'
import { RequireAuth, RequireRole, RoleRedirect } from '../../../noc/src/components/auth/RouteGuards'

const PartnerDashboard = lazy(() => import('../pages/PartnerDashboard').then(m => ({ default: m.PartnerDashboard })))
const PipelinePage     = lazy(() => import('../pages/PipelinePage').then(m => ({ default: m.PipelinePage })))
const ClientsPage      = lazy(() => import('../pages/ClientsPage').then(m => ({ default: m.ClientsPage })))
const CommissionsPage  = lazy(() => import('../pages/CommissionsPage').then(m => ({ default: m.CommissionsPage })))
const OnboardingPage   = lazy(() => import('../pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })))

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
        element: <RequireRole roles={['partner']} redirectTo="/login" />,
        children: [
          {
            path: '/partner',
            element: <AppShell />,
            children: [
              { index: true,          element: <Lazy><PartnerDashboard /></Lazy> },
              { path: 'pipeline',     element: <Lazy><PipelinePage /></Lazy> },
              { path: 'clients',      element: <Lazy><ClientsPage /></Lazy> },
              { path: 'commissions',  element: <Lazy><CommissionsPage /></Lazy> },
              { path: 'onboarding',   element: <Lazy><OnboardingPage /></Lazy> },
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
