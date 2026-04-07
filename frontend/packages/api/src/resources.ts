import { http } from './client'
import type {
  Customer,
  Partner,
  Lead,
  Commission,
  PaginatedResponse,
  QueryParams,
  AuthResponse,
  AuthUser,
  BackendRole,
  UserRole,
} from './types'

function normalizeRole(user: Partial<AuthUser> & { roles?: BackendRole[] }): UserRole {
  if (user.role && ['admin', 'customer', 'partner'].includes(user.role)) {
    return user.role as UserRole
  }

  if (user.roles?.some((role) => role === 'SUPER_ADMIN' || role === 'NOC_ENGINEER')) {
    return 'admin'
  }

  if (user.roles?.some((role) => role === 'PARTNER_ADMIN' || role === 'PARTNER_USER')) {
    return 'partner'
  }

  return 'customer'
}

export function normalizeAuthUser(user: Record<string, unknown>): AuthUser {
  const roles = Array.isArray(user.roles) ? (user.roles as BackendRole[]) : []
  const fullName =
    (typeof user.fullName === 'string' && user.fullName) ||
    (typeof user.name === 'string' && user.name) ||
    ''
  const email = typeof user.email === 'string' ? user.email : ''

  return {
    id:
      (typeof user.id === 'string' && user.id) ||
      (typeof user.userId === 'string' && user.userId) ||
      email,
    userId:
      (typeof user.userId === 'string' && user.userId) ||
      (typeof user.id === 'string' ? user.id : undefined),
    name: fullName || email || 'User',
    fullName: fullName || undefined,
    email,
    role: normalizeRole({
      role: typeof user.role === 'string' ? (user.role as UserRole) : undefined,
      roles,
    }),
    roles,
    avatarUrl: typeof user.avatarUrl === 'string' ? user.avatarUrl : undefined,
    organizationId:
      (typeof user.organizationId === 'string' && user.organizationId) ||
      (typeof user.customerId === 'string' && user.customerId) ||
      (typeof user.partnerId === 'string' && user.partnerId) ||
      undefined,
    organizationName:
      (typeof user.organizationName === 'string' && user.organizationName) || undefined,
    customerId: typeof user.customerId === 'string' ? user.customerId : undefined,
    partnerId: typeof user.partnerId === 'string' ? user.partnerId : undefined,
    accountScope:
      user.accountScope === 'platform' ||
      user.accountScope === 'customer' ||
      user.accountScope === 'partner' ||
      user.accountScope === 'internal'
        ? user.accountScope
        : undefined,
  }
}

function normalizeAuthResponse(data: Record<string, unknown>): AuthResponse {
  return {
    accessToken: String(data.accessToken ?? ''),
    refreshToken: String(data.refreshToken ?? ''),
    user: normalizeAuthUser((data.user as Record<string, unknown>) ?? {}),
  }
}

export const customersApi = {
  list: (params?: QueryParams) =>
    http.get<PaginatedResponse<Customer>>('/customers', { params }).then((r) => r.data),

  getById: (id: string) =>
    http.get<Customer>(`/customers/${id}`).then((r) => r.data),

  getSlaReport: (id: string, month: string) =>
    http.get(`/customers/${id}/sla-report`, { params: { month } }).then((r) => r.data),

  getBilling: (id: string) =>
    http.get(`/customers/${id}/billing`).then((r) => r.data),
}

export const partnersApi = {
  list: (params?: QueryParams) =>
    http.get<PaginatedResponse<Partner>>('/partners', { params }).then((r) => r.data),

  getById: (id: string) =>
    http.get<Partner>(`/partners/${id}`).then((r) => r.data),

  getLeads: (partnerId: string, params?: QueryParams) =>
    http.get<PaginatedResponse<Lead>>(`/partners/${partnerId}/leads`, { params }).then((r) => r.data),

  createLead: (partnerId: string, payload: Partial<Lead>) =>
    http.post<Lead>(`/partners/${partnerId}/leads`, payload).then((r) => r.data),

  updateLead: (partnerId: string, leadId: string, payload: Partial<Lead>) =>
    http.patch<Lead>(`/partners/${partnerId}/leads/${leadId}`, payload).then((r) => r.data),

  getCommissions: (partnerId: string, params?: QueryParams) =>
    http
      .get<PaginatedResponse<Commission>>(`/partners/${partnerId}/commissions`, { params })
      .then((r) => r.data),

  getDashboardStats: (partnerId: string) =>
    http
      .get<{
        totalClients: number
        monthlyRevenue: number
        pendingCommission: number
        activeLeads: number
        conversionRate: number
        pendingInstalls: number
      }>(`/partners/${partnerId}/stats`)
      .then((r) => r.data),
}

export const authApi = {
  login: (email: string, password: string) =>
    http.post('/auth/login', { email, password }).then((r) => normalizeAuthResponse(r.data)),

  logout: () =>
    http.post('/auth/logout').then((r) => r.data),

  me: () =>
    http.get('/auth/me').then((r) => normalizeAuthUser(r.data)),
}
