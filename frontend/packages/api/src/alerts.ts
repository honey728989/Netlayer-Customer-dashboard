import { http } from './client'
import type { Alert, PaginatedResponse, QueryParams } from './types'

export const alertsApi = {
  list: (params?: QueryParams) =>
    http.get<PaginatedResponse<Alert>>('/alerts', { params }).then((r) => r.data),

  getById: (id: string) =>
    http.get<Alert>(`/alerts/${id}`).then((r) => r.data),

  acknowledge: (id: string) =>
    http.post<Alert>(`/alerts/${id}/ack`).then((r) => r.data),

  resolve: (id: string, notes?: string) =>
    http.post<Alert>(`/alerts/${id}/resolve`, { notes }).then((r) => r.data),

  getActiveCount: () =>
    http
      .get<{ total: number; critical: number; warning: number; info: number }>('/alerts/count')
      .then((r) => r.data),
}
