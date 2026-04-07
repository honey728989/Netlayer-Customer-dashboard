import { useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query'
import { sitesApi, alertsApi, ticketsApi, customersApi, partnersApi } from '@netlayer/api'
import { queryClient, queryKeys } from '@/services/queryClient'
import type { QueryParams } from '@netlayer/api'

// ─── Sites ────────────────────────────────────────────────────────────────────

export const useSites = (params?: QueryParams) =>
  useQuery({
    queryKey: queryKeys.sites.list(params),
    queryFn: () => sitesApi.list(params),
  })

export const useSite = (id: string) =>
  useQuery({
    queryKey: queryKeys.sites.detail(id),
    queryFn: () => sitesApi.getById(id),
    enabled: Boolean(id),
  })

export const useSiteTraffic = (id: string, from: string, to: string) =>
  useQuery({
    queryKey: queryKeys.sites.traffic(id, from, to),
    queryFn: () => sitesApi.getTraffic(id, from, to),
    enabled: Boolean(id),
    staleTime: 10_000,
  })

export const useSiteDevices = (id: string) =>
  useQuery({
    queryKey: queryKeys.sites.devices(id),
    queryFn: () => sitesApi.getDevices(id),
    enabled: Boolean(id),
    refetchInterval: 30_000,
  })

export const useSiteEvents = (id: string, params?: QueryParams) =>
  useQuery({
    queryKey: queryKeys.sites.events(id, params),
    queryFn: () => sitesApi.getEvents(id, params),
    enabled: Boolean(id),
  })

export const useSiteStats = () =>
  useQuery({
    queryKey: queryKeys.sites.stats(),
    queryFn: () => sitesApi.getStats(),
    refetchInterval: 30_000,
  })

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const useAlerts = (params?: QueryParams) =>
  useQuery({
    queryKey: queryKeys.alerts.list(params),
    queryFn: () => alertsApi.list(params),
    refetchInterval: 15_000,
  })

export const useAlertCount = () =>
  useQuery({
    queryKey: queryKeys.alerts.count(),
    queryFn: () => alertsApi.getActiveCount(),
    refetchInterval: 10_000,
  })

export const useAcknowledgeAlert = () =>
  useMutation({
    mutationFn: (id: string) => alertsApi.acknowledge(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.lists() })
      queryClient.setQueryData(queryKeys.alerts.detail(data.id), data)
    },
  })

export const useResolveAlert = () =>
  useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      alertsApi.resolve(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all })
    },
  })

// ─── Tickets ──────────────────────────────────────────────────────────────────

export const useTickets = (params?: QueryParams) =>
  useQuery({
    queryKey: queryKeys.tickets.list(params),
    queryFn: () => ticketsApi.list(params),
    refetchInterval: 30_000,
  })

export const useTicket = (id: string) =>
  useQuery({
    queryKey: queryKeys.tickets.detail(id),
    queryFn: () => ticketsApi.getById(id),
    enabled: Boolean(id),
  })

export const useTicketSlaStats = () =>
  useQuery({
    queryKey: queryKeys.tickets.slaStats(),
    queryFn: () => ticketsApi.getSlaStats(),
    refetchInterval: 60_000,
  })

export const useCreateTicket = () =>
  useMutation({
    mutationFn: ticketsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.lists() })
    },
  })

export const useUpdateTicket = () =>
  useMutation({
    mutationFn: ({ id, ...payload }: Parameters<typeof ticketsApi.update>[1] & { id: string }) =>
      ticketsApi.update(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.lists() })
    },
  })

export const useAddTicketComment = () =>
  useMutation({
    mutationFn: ({ id, body, isInternal }: { id: string; body: string; isInternal?: boolean }) =>
      ticketsApi.addComment(id, body, isInternal),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(id) })
    },
  })

// ─── Customers ────────────────────────────────────────────────────────────────

export const useCustomers = (params?: QueryParams) =>
  useQuery({
    queryKey: queryKeys.customers.list(params),
    queryFn: () => customersApi.list(params),
  })

export const useCustomer = (id: string) =>
  useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => customersApi.getById(id),
    enabled: Boolean(id),
  })

// ─── Partners ─────────────────────────────────────────────────────────────────

export const usePartners = (params?: QueryParams) =>
  useQuery({
    queryKey: queryKeys.partners.list(params),
    queryFn: () => partnersApi.list(params),
  })

export const usePartner = (id: string) =>
  useQuery({
    queryKey: queryKeys.partners.detail(id),
    queryFn: () => partnersApi.getById(id),
    enabled: Boolean(id),
  })

export const usePartnerStats = (id: string) =>
  useQuery({
    queryKey: queryKeys.partners.stats(id),
    queryFn: () => partnersApi.getDashboardStats(id),
    enabled: Boolean(id),
    refetchInterval: 60_000,
  })

export const usePartnerLeads = (partnerId: string, params?: QueryParams) =>
  useQuery({
    queryKey: queryKeys.partners.leads(partnerId, params),
    queryFn: () => partnersApi.getLeads(partnerId, params),
    enabled: Boolean(partnerId),
  })

export const usePartnerCommissions = (partnerId: string, params?: QueryParams) =>
  useQuery({
    queryKey: queryKeys.partners.commissions(partnerId, params),
    queryFn: () => partnersApi.getCommissions(partnerId, params),
    enabled: Boolean(partnerId),
  })
