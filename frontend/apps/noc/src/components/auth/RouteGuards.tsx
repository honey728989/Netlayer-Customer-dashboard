import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@netlayer/auth'
import type { UserRole } from '@netlayer/api'

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

  if (!user || !user.role || !roles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />
  }

  return <Outlet />
}

// ─── Role-based redirect from root ────────────────────────────────────────────

export function RoleRedirect() {
  const { user, isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const roleMap: Record<UserRole, string> = {
    admin: '/noc',
    customer: '/portal',
    partner: '/partner',
  }

  return <Navigate to={roleMap[user.role] ?? '/login'} replace />
}
