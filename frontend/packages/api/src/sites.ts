import { http } from './client'
import type { Site, SiteCreatePayload, SiteDevice, SiteDeviceCreatePayload, SiteEvent, SiteTraffic, Service, PaginatedResponse, QueryParams } from './types'

function toPaginated<T>(raw: unknown, params?: QueryParams): PaginatedResponse<T> {
  if (Array.isArray(raw)) {
    const data = raw as T[]
    return {
      data,
      total: data.length,
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? data.length,
      totalPages: 1,
    }
  }

  return raw as PaginatedResponse<T>
}

export const sitesApi = {
  list: (params?: QueryParams) =>
    http.get<PaginatedResponse<Site>>('/sites', { params }).then((r) => toPaginated<Site>(r.data, params)),

  createForCustomer: (customerId: string, payload: SiteCreatePayload) =>
    http.post<Site>(`/customers/${customerId}/sites`, payload).then((r) => r.data),

  getById: (id: string) =>
    http.get<Site>(`/sites/${id}`).then((r) => r.data),

  getTraffic: (id: string, from: string, to: string) =>
    http.get<SiteTraffic[]>(`/sites/${id}/traffic`, { params: { from, to } }).then((r) => r.data),

  getServices: (id: string) =>
    http.get<Service[]>(`/sites/${id}/services`).then((r) => r.data),

  getDevices: (id: string) =>
    http.get<SiteDevice[]>(`/sites/${id}/devices`).then((r) => r.data),

  createDevice: (id: string, payload: SiteDeviceCreatePayload) =>
    http.post<SiteDevice>(`/sites/${id}/devices`, payload).then((r) => r.data),

  getEvents: (id: string, params?: QueryParams) =>
    http.get<PaginatedResponse<SiteEvent>>(`/sites/${id}/events`, { params }).then((r) => toPaginated<SiteEvent>(r.data, params)),

  getStats: () =>
    http
      .get<{ total: number; online: number; offline: number; degraded: number; maintenance: number }>(
        '/sites/stats',
      )
      .then((r) => r.data),
}
