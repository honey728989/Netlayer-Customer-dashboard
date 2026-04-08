import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@netlayer/auth'
import { alertsApi, feasibilityApi, ticketsApi, type Alert, type FeasibilityRequest, type Ticket } from '@netlayer/api'
import { Card, PageHeader } from '@netlayer/ui'

type NotificationItem = {
  id: string
  title: string
  body: string
  meta: string
  href: string
  createdAt?: string
  kind: 'alert' | 'ticket' | 'feasibility'
}

function formatDate(value?: string) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-IN')
}

export function CustomerNotificationsPage() {
  const { user } = useAuthStore()
  const customerId = user?.customerId ?? user?.organizationId ?? ''

  const { data: alertsResponse } = useQuery({
    queryKey: ['alerts', 'notifications', customerId],
    queryFn: () => alertsApi.list({ pageSize: 10 }),
    enabled: Boolean(customerId),
    staleTime: 30_000,
  })

  const { data: ticketsResponse } = useQuery({
    queryKey: ['tickets', 'notifications', customerId],
    queryFn: () => ticketsApi.list({ customerId, pageSize: 10 }),
    enabled: Boolean(customerId),
    staleTime: 30_000,
  })

  const { data: feasibilityItems = [] } = useQuery({
    queryKey: ['feasibility', 'notifications', customerId],
    queryFn: () => feasibilityApi.list({ customerId, pageSize: 10 }),
    enabled: Boolean(customerId),
    staleTime: 60_000,
  })

  const feed = useMemo(() => {
    const alerts = ((alertsResponse?.data ?? []) as Alert[]).map<NotificationItem>((alert) => ({
      id: `alert-${alert.id}`,
      title: `${alert.priority} alert on ${alert.site_name ?? alert.siteName ?? 'site'}`,
      body: alert.message,
      meta: `Monitoring • ${alert.status}`,
      href: '/portal/heatmap',
      createdAt: alert.created_at ?? alert.triggeredAt,
      kind: 'alert',
    }))

    const tickets = ((ticketsResponse?.data ?? []) as Ticket[]).map<NotificationItem>((ticket) => ({
      id: `ticket-${ticket.id}`,
      title: ticket.title ?? ticket.subject ?? `Ticket ${ticket.id.slice(-5)}`,
      body: ticket.status === 'RESOLVED' ? 'Ticket resolved by support team.' : 'Support ticket activity requires your attention.',
      meta: `Support • ${ticket.status}`,
      href: `/portal/tickets/${ticket.id}`,
      createdAt: ticket.updated_at ?? ticket.updatedAt ?? ticket.created_at ?? ticket.createdAt,
      kind: 'ticket',
    }))

    const feasibility = (feasibilityItems as FeasibilityRequest[]).map<NotificationItem>((item) => ({
      id: `feasibility-${item.id}`,
      title: item.site_name ?? item.siteName ?? item.request_code ?? 'Feasibility request',
      body: item.feasibility_summary ?? item.result_notes ?? item.notes ?? 'Feasibility request updated.',
      meta: `Feasibility • ${item.status}`,
      href: '/portal/feasibility',
      createdAt: item.created_at,
      kind: 'feasibility',
    }))

    return [...alerts, ...tickets, ...feasibility]
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
      .slice(0, 12)
  }, [alertsResponse, feasibilityItems, ticketsResponse])

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <PageHeader
        title="Notifications Center"
        subtitle="Operational updates, support activity, and feasibility progress in one place"
      />

      <Card title="Recent Updates">
        <div className="space-y-3">
          {feed.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No recent notifications.</p>
          ) : (
            feed.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className="block rounded-xl border p-4 transition-colors hover:bg-surface-2"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                    <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-muted)' }}>{item.body}</p>
                  </div>
                  <span className="text-[10px] font-mono uppercase" style={{ color: 'var(--brand)' }}>{item.kind}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-dim)' }}>{item.meta}</span>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-dim)' }}>{formatDate(item.createdAt)}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
