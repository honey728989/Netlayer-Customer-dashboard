import { http } from './client'
import type {
  Customer,
  Partner,
  Lead,
  Commission,
  PaginatedResponse,
  QueryParams,
} from './types'

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
    http.post('/auth/login', { email, password }).then((r) => r.data),

  logout: () =>
    http.post('/auth/logout').then((r) => r.data),

  me: () =>
    http.get('/auth/me').then((r) => r.data),
}
