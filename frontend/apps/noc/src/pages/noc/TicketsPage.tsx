import { useState } from 'react'
import { Plus, Search, Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { ticketsApi } from '@netlayer/api'
import { TicketPriorityBadge } from '@netlayer/ui'
import { NewTicketModal } from '@/components/tickets/NewTicketModal'
import type { Ticket } from '@netlayer/api'

const STATUS_COLORS: Record<string, string> = {
  OPEN:        'var(--brand)',
  IN_PROGRESS: 'var(--status-info)',
  PENDING:     'var(--status-degraded)',
  RESOLVED:    'var(--status-online)',
  CLOSED:      'var(--text-dim)',
}

function TicketStatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status?.toUpperCase()] ?? 'var(--text-muted)'
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
          style={{
            color,
            backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
          }}>
      {(status ?? '').replace('_', ' ')}
    </span>
  )
}

function SlaTimer({ dueAt, status }: { dueAt?: string; status: string }) {
  if (!dueAt || status === 'RESOLVED' || status === 'CLOSED') {
    return <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>—</span>
  }
  const due = new Date(dueAt)
  const now = new Date()
  const breached = due < now
  const color = breached ? 'var(--status-offline)' : due.getTime() - now.getTime() < 30 * 60 * 1000 ? 'var(--status-degraded)' : 'var(--status-online)'
  return (
    <span className="font-mono text-[10px]" style={{ color }}>
      {breached ? '⚠ ' : ''}{formatDistanceToNow(due, { addSuffix: true })}
    </span>
  )
}

function TicketRow({ ticket }: { ticket: Ticket }) {
  return (
    <tr className="table-row cursor-pointer">
      <td className="table-td w-16">
        <span className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
          #{ticket.id.slice(-5)}
        </span>
      </td>
      <td className="table-td">
        <p className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>
          {ticket.title ?? ticket.subject}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {ticket.customer_name ?? ticket.customerName} · {ticket.site_name ?? ticket.siteName ?? 'No site'}
        </p>
      </td>
      <td className="table-td w-20">
        <TicketPriorityBadge priority={ticket.priority} />
      </td>
      <td className="table-td w-28">
        <TicketStatusBadge status={ticket.status} />
      </td>
      <td className="table-td w-36">
        <SlaTimer dueAt={ticket.resolution_due_at ?? ticket.resolutionDueAt} status={ticket.status} />
      </td>
      <td className="table-td w-28 font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
        {ticket.assignee_name ?? ticket.assigneeName ?? <span style={{ color: 'var(--text-dim)' }}>Unassigned</span>}
      </td>
      <td className="table-td w-28 font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
        {formatDistanceToNow(new Date(ticket.created_at ?? ticket.createdAt ?? Date.now()), { addSuffix: true })}
      </td>
    </tr>
  )
}

export function TicketsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)

  const { data: slaStats, isLoading: slaLoading } = useQuery({
    queryKey: ['tickets', 'sla-stats'],
    queryFn: () => ticketsApi.getSlaStats(),
    refetchInterval: 60_000,
  })
  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['tickets', 'list', search, statusFilter, priorityFilter],
    queryFn: () => ticketsApi.list({ search: search || undefined, status: statusFilter || undefined, priority: priorityFilter || undefined, pageSize: 100 }),
    refetchInterval: 30_000,
  })

  const tickets = ticketsData?.data ?? []
  const filtered = tickets.filter(t => {
    const matchSearch = !search || (t.title ?? t.subject ?? '').toLowerCase().includes(search.toLowerCase())
    return matchSearch
  })

  return (
    <div className="space-y-5 p-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Ticket Management</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>SLA-aware support lifecycle · auto-refresh 30s</p>
        </div>
        <button onClick={() => setShowNewModal(true)} className="btn-primary gap-1.5">
          <Plus size={13} /> New Ticket
        </button>
      </div>

      {/* SLA Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Open',           value: slaStats?.open ?? 0,          icon: Clock,        color: 'var(--brand)' },
          { label: 'In Progress',    value: slaStats?.inProgress ?? 0,    icon: Loader,       color: 'var(--status-info)' },
          { label: 'At Risk',        value: slaStats?.atRisk ?? 0,        icon: AlertCircle,  color: 'var(--status-degraded)' },
          { label: 'SLA Breached',   value: slaStats?.breached ?? 0,      icon: AlertCircle,  color: 'var(--status-offline)' },
          { label: 'Resolved Today', value: slaStats?.resolvedToday ?? 0, icon: CheckCircle,  color: 'var(--status-online)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card px-4 py-3 flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                 style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
              <Icon size={13} />
            </div>
            <div>
              <p className="font-mono text-lg font-bold leading-none" style={{ color }}>{slaLoading ? '—' : value}</p>
              <p className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
          <input className="input-field pl-7 w-56" placeholder="Search tickets…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-tab-group">
          {[['', 'All'], ['OPEN', 'Open'], ['IN_PROGRESS', 'In Progress'], ['RESOLVED', 'Resolved'], ['CLOSED', 'Closed']].map(([v, l]) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={statusFilter === v ? 'filter-tab-active' : 'filter-tab'}>{l}</button>
          ))}
        </div>
        <div className="filter-tab-group">
          {[['', 'All P'], ['P1', 'P1'], ['P2', 'P2'], ['P3', 'P3'], ['P4', 'P4']].map(([v, l]) => (
            <button key={v} onClick={() => setPriorityFilter(v)}
              className={priorityFilter === v ? 'filter-tab-active' : 'filter-tab'}>{l}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
              <tr>
                <th className="table-th">ID</th>
                <th className="table-th">Subject / Customer</th>
                <th className="table-th">Priority</th>
                <th className="table-th">Status</th>
                <th className="table-th">SLA Due</th>
                <th className="table-th">Assignee</th>
                <th className="table-th">Created</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="table-row">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="table-td"><div className="skeleton h-4 rounded w-full max-w-[100px]" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No tickets found</td></tr>
              ) : (
                filtered.map(t => <TicketRow key={t.id} ticket={t} />)
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-2 text-[11px]" style={{ color: 'var(--text-dim)', borderTop: '1px solid var(--border)' }}>
            {filtered.length} ticket{filtered.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {showNewModal && <NewTicketModal onClose={() => setShowNewModal(false)} />}
    </div>
  )
}
