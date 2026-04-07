import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error: unknown) => {
        const status = (error as { response?: { status?: number } })?.response?.status
        if (status === 401 || status === 403 || status === 404) return false
        return failureCount < 2
      },
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
})

// ─── Query Key Factories ──────────────────────────────────────────────────────

export const queryKeys = {
  sites: {
    all: ['sites'] as const,
    lists: () => [...queryKeys.sites.all, 'list'] as const,
    list: (params?: object) => [...queryKeys.sites.lists(), params] as const,
    detail: (id: string) => [...queryKeys.sites.all, 'detail', id] as const,
    traffic: (id: string, from: string, to: string) =>
      [...queryKeys.sites.detail(id), 'traffic', from, to] as const,
    devices: (id: string) => [...queryKeys.sites.detail(id), 'devices'] as const,
    events: (id: string, params?: object) =>
      [...queryKeys.sites.detail(id), 'events', params] as const,
    stats: () => [...queryKeys.sites.all, 'stats'] as const,
  },

  alerts: {
    all: ['alerts'] as const,
    lists: () => [...queryKeys.alerts.all, 'list'] as const,
    list: (params?: object) => [...queryKeys.alerts.lists(), params] as const,
    detail: (id: string) => [...queryKeys.alerts.all, 'detail', id] as const,
    count: () => [...queryKeys.alerts.all, 'count'] as const,
  },

  tickets: {
    all: ['tickets'] as const,
    lists: () => [...queryKeys.tickets.all, 'list'] as const,
    list: (params?: object) => [...queryKeys.tickets.lists(), params] as const,
    detail: (id: string) => [...queryKeys.tickets.all, 'detail', id] as const,
    slaStats: () => [...queryKeys.tickets.all, 'sla-stats'] as const,
  },

  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (params?: object) => [...queryKeys.customers.lists(), params] as const,
    detail: (id: string) => [...queryKeys.customers.all, 'detail', id] as const,
    billing: (id: string) => [...queryKeys.customers.detail(id), 'billing'] as const,
    sla: (id: string, month: string) => [...queryKeys.customers.detail(id), 'sla', month] as const,
  },

  partners: {
    all: ['partners'] as const,
    lists: () => [...queryKeys.partners.all, 'list'] as const,
    list: (params?: object) => [...queryKeys.partners.lists(), params] as const,
    detail: (id: string) => [...queryKeys.partners.all, 'detail', id] as const,
    leads: (id: string, params?: object) =>
      [...queryKeys.partners.detail(id), 'leads', params] as const,
    commissions: (id: string, params?: object) =>
      [...queryKeys.partners.detail(id), 'commissions', params] as const,
    stats: (id: string) => [...queryKeys.partners.detail(id), 'stats'] as const,
  },
}
