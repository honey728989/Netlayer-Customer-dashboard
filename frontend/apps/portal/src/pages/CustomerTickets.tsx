import { useState } from 'react'
import { Plus, Ticket as TicketIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@netlayer/auth'
import { ticketsApi } from '@netlayer/api'
import type { Ticket } from '@netlayer/api'

const STATUS_COLOR: Record<string, string> = {
  OPEN:        'var(--brand)',
  IN_PROGRESS: 'var(--status-info)',
  PENDING:     'var(--status-degraded)',
  RESOLVED:    'var(--status-online)',
  CLOSED:      'var(--text-dim)',
}

function priorityColor(p: string) {
  const u = p?.toUpperCase()
  if (u === 'P1' || u === 'CRITICAL') return 'var(--status-offline)'
  if (u === 'P2' || u === 'HIGH')     return 'var(--status-degraded)'
  if (u === 'P3' || u === 'MEDIUM')   return 'var(--status-info)'
  return 'var(--text-muted)'
}

function TicketStatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status?.toUpperCase()] ?? 'var(--text-muted)'
  return (
    <span className="inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
          style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}>
      {(status ?? '').replace('_', ' ')}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const color = priorityColor(priority)
  return (
    <span className="inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
          style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}>
      {priority?.toUpperCase()}
    </span>
  )
}

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
]

export function CustomerTickets() {
  const { user } = useAuthStore()
  const customerId = user?.customerId ?? user?.organizationId ?? ''
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['tickets', 'list', customerId, statusFilter],
    queryFn: () => ticketsApi.list({
      customerId,
      status: statusFilter || undefined,
      pageSize: 100,
    }),
    enabled: Boolean(customerId),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const tickets = (ticketsData?.data ?? []) as Ticket[]
  const filtered = tickets.filter(t =>
    !search ||
    (t.title ?? t.subject ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5 p-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Support Tickets</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {ticketsData?.total ?? 0} ticket{(ticketsData?.total ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <a href="/portal/tickets/new" className="btn-primary gap-1.5">
          <Plus size={13} /> Raise Ticket
        </a>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <input className="input-field pl-3 w-56" placeholder="Search tickets…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-tab-group">
          {STATUS_TABS.map(tab => (
            <button key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={statusFilter === tab.value ? 'filter-tab-active' : 'filter-tab'}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
              <tr>
                <th className="table-th w-16">ID</th>
                <th className="table-th">Subject</th>
                <th className="table-th w-24">Priority</th>
                <th className="table-th w-28">Status</th>
                <th className="table-th w-32">SLA Due</th>
                <th className="table-th w-28">Opened</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="table-row">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="table-td"><div className="skeleton h-4 rounded w-full max-w-[100px]" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    <TicketIcon size={24} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs">
                      {statusFilter ? 'No tickets with this status' : 'No open tickets — great job!'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((t: Ticket) => {
                  const slaDate = t.resolution_due_at ?? t.resolutionDueAt
                  const slaMs = slaDate ? new Date(slaDate).getTime() - Date.now() : null
                  const slaBreached = slaMs !== null && slaMs <= 0
                  const slaHours = slaMs !== null ? Math.floor(slaMs / 3_600_000) : null

                  return (
                    <tr key={t.id} className="table-row">
                      <td className="table-td">
                        <span className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
                          #{t.id.slice(-5)}
                        </span>
                      </td>
                      <td className="table-td">
                        <p className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>
                          {t.title ?? t.subject}
                        </p>
                        {(t.site_name ?? t.siteName) && (
                          <p className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
                            {t.site_name ?? t.siteName}
                          </p>
                        )}
                      </td>
                      <td className="table-td">
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td className="table-td">
                        <TicketStatusBadge status={t.status} />
                      </td>
                      <td className="table-td">
                        {!slaDate ? (
                          <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>—</span>
                        ) : slaBreached ? (
                          <span className="font-mono text-[10px]" style={{ color: 'var(--status-offline)' }}>⚠ Breached</span>
                        ) : (slaHours ?? 0) < 2 ? (
                          <span className="font-mono text-[10px]" style={{ color: 'var(--status-degraded)' }}>
                            {slaHours}h left
                          </span>
                        ) : (
                          <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {formatDistanceToNow(new Date(slaDate), { addSuffix: true })}
                          </span>
                        )}
                      </td>
                      <td className="table-td font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {formatDistanceToNow(
                          new Date(t.created_at ?? t.createdAt ?? Date.now()),
                          { addSuffix: true }
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && filtered.length > 0 && (
          <div className="px-4 py-2 text-[11px]" style={{ color: 'var(--text-dim)', borderTop: '1px solid var(--border)' }}>
            {filtered.length} ticket{filtered.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
