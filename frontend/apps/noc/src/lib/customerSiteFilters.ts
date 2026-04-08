import type { Site, Ticket, CustomerHeatmapPoint } from '@netlayer/api'

export interface CustomerSiteFilterState {
  selectedSiteId?: string | null
  city?: string
  status?: string
  serviceType?: string
}

export function applySiteFilters<T extends Site>(items: T[], filters: CustomerSiteFilterState) {
  return items.filter((item) => {
    if (filters.selectedSiteId && item.id !== filters.selectedSiteId) return false
    if (filters.city && (item.city ?? '').toLowerCase() !== filters.city.toLowerCase()) return false
    if (filters.status && (item.status ?? '').toUpperCase() !== filters.status.toUpperCase()) return false
    if (filters.serviceType && (item.type ?? '').toUpperCase() !== filters.serviceType.toUpperCase()) return false
    return true
  })
}

export function applyTicketFilters(items: Ticket[], filters: CustomerSiteFilterState) {
  return items.filter((item) => {
    if (filters.selectedSiteId && (item.site_id ?? item.siteId) !== filters.selectedSiteId) return false
    return true
  })
}

export function applyHeatmapFilters(items: CustomerHeatmapPoint[], filters: CustomerSiteFilterState) {
  return items.filter((item) => {
    if (filters.selectedSiteId && item.siteId !== filters.selectedSiteId) return false
    if (filters.city && (item.city ?? '').toLowerCase() !== filters.city.toLowerCase()) return false
    if (filters.status && (item.status ?? '').toUpperCase() !== filters.status.toUpperCase()) return false
    return true
  })
}
