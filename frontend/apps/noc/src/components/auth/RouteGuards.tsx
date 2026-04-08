import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@netlayer/auth'
import type { UserRole } from '@netlayer/api'

const HOME_BY_ROLE: Record<UserRole, string> = {
  admin: '/noc',
  customer: '/portal',
  partner: '/partner',
}

// ─── Require Auth ─────────────────────────────────────────────────────────────

export function RequireAuth() {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

// ─── Require Role ─────────────────────────────────────────────────────────────

interface RequireRoleProps {
  roles: UserRole[]
  redirectTo?: string
}

export function RequireRole({ roles, redirectTo = '/login' }: RequireRoleProps) {
  const { user, isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!user || !roles.includes(user.role)) {
    return <Navigate to={user ? HOME_BY_ROLE[user.role] : redirectTo} replace />
  }

  return <Outlet />
}

// ─── Role-based redirect from root ────────────────────────────────────────────

export function RoleRedirect() {
  const { user, isAuthenticated } = useAuthStore()

  if (!isAuthenticated || !user?.role) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={HOME_BY_ROLE[user.role] ?? '/login'} replace />
}
