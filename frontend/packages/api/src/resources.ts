import { http } from './client'
import type {
  Customer,
  Partner,
  Lead,
  Service,
  FeasibilityRequest,
  CustomerHeatmapPoint,
  BillingLedgerSummary,
  PaymentRecord,
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

  if (
    user.roles?.some(
      (role) =>
        role === 'SUPER_ADMIN' ||
        role === 'NOC_ENGINEER' ||
        role === 'SALES_EXECUTIVE' ||
        role === 'FINANCE_USER' ||
        role === 'FIELD_ENGINEER',
    )
  ) {
    return 'admin'
  }

  if (user.roles?.some((role) => role === 'PARTNER_ADMIN' || role === 'PARTNER_USER')) {
    return 'partner'
  }

  if (user.roles?.some((role) => role === 'ENTERPRISE_ADMIN' || role === 'ENTERPRISE_USER')) {
    return 'customer'
  }

  if (user.accountScope === 'partner') {
    return 'partner'
  }

  if (user.accountScope === 'customer') {
    return 'customer'
  }

  if (user.accountScope === 'platform' || user.accountScope === 'internal') {
    return 'admin'
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

function toPaginated<T>(raw: unknown, params?: QueryParams): PaginatedResponse<T> {
  if (Array.isArray(raw)) {
    return { data: raw as T[], total: (raw as T[]).length, page: params?.page ?? 1, pageSize: params?.pageSize ?? (raw as T[]).length, totalPages: 1 }
  }
  return raw as PaginatedResponse<T>
}

export const customersApi = {
  list: (params?: QueryParams) =>
    http.get('/customers', { params }).then((r) => toPaginated<Customer>(r.data, params)),

  getById: (id: string) =>
    http.get<Customer>(`/customers/${id}`).then((r) => r.data),

  getOverview: (id: string) =>
    http.get(`/customers/${id}/overview`).then((r) => r.data),

  getServices: (id: string) =>
    http.get<Service[]>(`/customers/${id}/services`).then((r) => r.data),

  getSlaReport: (id: string, month: string) =>
    http.get(`/customers/${id}/sla-report`, { params: { month } }).then((r) => r.data),

  getBilling: (id: string) =>
    http.get(`/customers/${id}/billing`).then((r) => r.data),

  getLedger: (id: string) =>
    http.get<BillingLedgerSummary>(`/customers/${id}/ledger`).then((r) => r.data),

  getPayments: (id: string) =>
    http.get<PaymentRecord[]>(`/customers/${id}/payments`).then((r) => r.data),

  createPaymentLink: (id: string, payload: { amount: number; invoiceId?: string; description?: string }) =>
    http.post<PaymentRecord>(`/customers/${id}/payment-links`, payload).then((r) => r.data),

  getHeatmap: (id: string) =>
    http.get<CustomerHeatmapPoint[]>(`/customers/${id}/heatmap`).then((r) => r.data),
}

export const feasibilityApi = {
  list: (params?: QueryParams) =>
    http.get<FeasibilityRequest[]>('/feasibility', { params }).then((r) => Array.isArray(r.data) ? r.data : (r.data as any)?.data ?? []),

  getById: (id: string) =>
    http.get<FeasibilityRequest>(`/feasibility/${id}`).then((r) => r.data),

  create: (payload: Record<string, unknown>) =>
    http.post<FeasibilityRequest>('/feasibility', payload).then((r) => r.data),

  updateStatus: (id: string, status: string, notes?: string, surveyDate?: string) =>
    http.patch<FeasibilityRequest>(`/feasibility/${id}/status`, { status, notes, surveyDate }).then((r) => r.data),
}

export const leadsApi = {
  list: (params?: QueryParams) =>
    http.get<Lead[]>('/leads', { params }).then((r) => Array.isArray(r.data) ? r.data : (r.data as any)?.data ?? []),

  getStats: () =>
    http.get('/leads/stats').then((r) => r.data),

  create: (payload: Record<string, unknown>) =>
    http.post<Lead>('/leads', payload).then((r) => r.data),

  update: (id: string, payload: Record<string, unknown>) =>
    http.patch<Lead>(`/leads/${id}`, payload).then((r) => r.data),
}

export const partnersApi = {
  list: (params?: QueryParams) =>
    http.get('/partners', { params }).then((r) => toPaginated<Partner>(r.data, params)),

  getById: (id: string) =>
    http.get<Partner>(`/partners/${id}`).then((r) => r.data),

  getLeads: (partnerId: string, params?: QueryParams) =>
    http.get<Lead[]>(`/partners/${partnerId}/leads`, { params }).then((r) => Array.isArray(r.data) ? r.data : (r.data as any)?.data ?? []),

  createLead: (partnerId: string, payload: Partial<Lead>) =>
    http.post<Lead>(`/partners/${partnerId}/leads`, payload).then((r) => r.data),

  updateLead: (partnerId: string, leadId: string, payload: Partial<Lead>) =>
    http.patch<Lead>(`/partners/${partnerId}/leads/${leadId}`, payload).then((r) => r.data),

  getCustomers: (partnerId: string) =>
    http.get<Customer[]>(`/partners/${partnerId}/customers`).then((r) => Array.isArray(r.data) ? r.data : []),

  getRevenue: (partnerId: string) =>
    http.get(`/partners/${partnerId}/revenue`).then((r) => r.data),

  getCommissions: (partnerId: string, params?: QueryParams) =>
    http.get<Commission[]>(`/partners/${partnerId}/commission`, { params }).then((r) => Array.isArray(r.data) ? r.data : []),

  getDashboardStats: (partnerId: string) =>
    http.get(`/partners/${partnerId}/dashboard`).then((r) => r.data),

  getPipeline: () =>
    http.get('/sales/pipeline').then((r) => r.data),
}

export const authApi = {
  login: (email: string, password: string) =>
    http.post('/auth/login', { email, password }).then((r) => normalizeAuthResponse(r.data)),

  logout: () =>
    http.post('/auth/logout').then((r) => r.data),

  me: () =>
    http.get('/auth/me').then((r) => normalizeAuthUser(r.data)),
}
