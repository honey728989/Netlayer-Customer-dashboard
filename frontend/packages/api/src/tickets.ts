import { http } from './client'
import type { Ticket, TicketComment, PaginatedResponse, QueryParams } from './types'

interface CreateTicketPayload {
  subject: string
  description: string
  priority: Ticket['priority']
  siteId?: string
  customerId: string
}

interface UpdateTicketPayload {
  status?: Ticket['status']
  priority?: Ticket['priority']
  assigneeId?: string
}

export const ticketsApi = {
  list: (params?: QueryParams) =>
    http.get<PaginatedResponse<Ticket>>('/tickets', { params }).then((r) => r.data),

  getById: (id: string) =>
    http.get<Ticket>(`/tickets/${id}`).then((r) => r.data),

  create: (payload: CreateTicketPayload) =>
    http.post<Ticket>('/tickets', payload).then((r) => r.data),

  update: (id: string, payload: UpdateTicketPayload) =>
    http.patch<Ticket>(`/tickets/${id}`, payload).then((r) => r.data),

  addComment: (id: string, body: string, isInternal = false) =>
    http.post<TicketComment>(`/tickets/${id}/comments`, { body, isInternal }).then((r) => r.data),

  getSlaStats: () =>
    http
      .get<{ open: number; inProgress: number; atRisk: number; breached: number; resolvedToday: number }>(
        '/tickets/sla-stats',
      )
      .then((r) => r.data),
}
