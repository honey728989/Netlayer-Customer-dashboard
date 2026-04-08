import { useMemo, useState } from 'react'
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
  if (!value) return '--'
  return new Date(value).toLocaleString('en-IN')
}

export function CustomerNotificationsPage() {
  const { user } = useAuthStore()
  const customerId = user?.customerId ?? user?.organizationId ?? ''
  const [selectedKind, setSelectedKind] = useState<'all' | NotificationItem['kind']>('all')

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
      meta: `Monitoring | ${alert.status}`,
      href: '/portal/heatmap',
      createdAt: alert.created_at ?? alert.triggeredAt,
      kind: 'alert',
    }))

    const tickets = ((ticketsResponse?.data ?? []) as Ticket[]).map<NotificationItem>((ticket) => ({
      id: `ticket-${ticket.id}`,
      title: ticket.title ?? ticket.subject ?? `Ticket ${ticket.id.slice(-5)}`,
      body: ticket.status === 'RESOLVED' ? 'Ticket resolved by support team.' : 'Support ticket activity needs review.',
      meta: `Support | ${ticket.status}`,
      href: `/portal/tickets/${ticket.id}`,
      createdAt: ticket.updated_at ?? ticket.updatedAt ?? ticket.created_at ?? ticket.createdAt,
      kind: 'ticket',
    }))

    const feasibility = (feasibilityItems as FeasibilityRequest[]).map<NotificationItem>((item) => ({
      id: `feasibility-${item.id}`,
      title: item.site_name ?? item.siteName ?? item.request_code ?? 'Feasibility request',
      body: item.feasibility_summary ?? item.result_notes ?? item.notes ?? 'Feasibility request updated.',
      meta: `Expansion | ${item.status}`,
      href: '/portal/feasibility',
      createdAt: item.created_at,
      kind: 'feasibility',
    }))

    return [...alerts, ...tickets, ...feasibility]
      .sort((left, right) => new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime())
      .slice(0, 16)
  }, [alertsResponse, feasibilityItems, ticketsResponse])

  const filteredFeed = selectedKind === 'all' ? feed : feed.filter((item) => item.kind === selectedKind)
  const counts = {
    alerts: feed.filter((item) => item.kind === 'alert').length,
    tickets: feed.filter((item) => item.kind === 'ticket').length,
    feasibility: feed.filter((item) => item.kind === 'feasibility').length,
  }

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <PageHeader
        title="Notifications Center"
        subtitle="Operational updates, support activity, and expansion progress in one workspace."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: 'All Updates', value: feed.length, key: 'all' as const },
          { label: 'Monitoring', value: counts.alerts, key: 'alert' as const },
          { label: 'Support', value: counts.tickets, key: 'ticket' as const },
          { label: 'Expansion', value: counts.feasibility, key: 'feasibility' as const },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => setSelectedKind(item.key)}
            className="metric-card text-left transition"
            style={selectedKind === item.key ? { borderTop: '2px solid var(--brand)' } : undefined}
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
            <p className="mt-3 font-mono text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
          </button>
        ))}
      </div>

      <Card title="Recent Updates">
        <div className="mb-4 flex flex-wrap gap-2">
          {(['all', 'alert', 'ticket', 'feasibility'] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => setSelectedKind(kind)}
              className={selectedKind === kind ? 'filter-tab-active' : 'filter-tab'}
            >
              {kind === 'all' ? 'All' : kind === 'alert' ? 'Monitoring' : kind === 'ticket' ? 'Support' : 'Expansion'}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredFeed.length === 0 ? (
            <div className="rounded-xl border border-border p-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              No notifications in this category right now.
            </div>
          ) : (
            filteredFeed.map((item) => (
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
