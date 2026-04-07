import { useState } from 'react'
import { Plus, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import {
  useTickets,
  useTicketSlaStats,
} from '@/hooks/useQueries'
import {
  KpiCard,
  DataTable,
  SearchInput,
  SlaTimerBadge,
  TicketPriorityBadge,
  type Column,
} from '@netlayer/ui'
import type { Ticket, TicketStatus } from '@netlayer/api'
import { NewTicketModal } from '@/components/tickets/NewTicketModal'

const STATUS_OPTIONS: Array<{ label: string; value: TicketStatus | '' }> = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Pending', value: 'pending' },
  { label: 'Resolved', value: 'resolved' },
]

const STATUS_STYLE: Record<TicketStatus, string> = {
  open: 'bg-brand/10 text-brand border border-brand/25',
  in_progress: 'bg-status-info/10 text-status-info border border-status-info/25',
  pending: 'bg-status-degraded/10 text-status-degraded border border-status-degraded/25',
  resolved: 'bg-status-online/10 text-status-online border border-status-online/25',
  closed: 'bg-surface-2 text-muted border border-border',
}

function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const label = status.replace('_', ' ')
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_STYLE[status]}`}>
      {label}
    </span>
  )
}

const COLUMNS: Column<Ticket>[] = [
  {
    key: 'id',
    header: 'ID',
    width: '80px',
    render: (t) => (
      <span className="font-mono text-[11px] text-muted">#{t.id.slice(-5)}</span>
    ),
  },
  {
    key: 'subject',
    header: 'Subject',
    render: (t) => (
      <div>
        <p className="font-medium text-white">{t.subject}</p>
        <p className="text-[10px] text-muted">
          {t.customerName}
          {t.siteName ? ` · ${t.siteName}` : ''}
        </p>
      </div>
    ),
  },
  {
    key: 'priority',
    header: 'Priority',
    width: '90px',
    render: (t) => <TicketPriorityBadge priority={t.priority} />,
  },
  {
    key: 'status',
    header: 'Status',
    width: '110px',
    render: (t) => <TicketStatusBadge status={t.status} />,
  },
  {
    key: 'assignee',
    header: 'Assignee',
    width: '130px',
    render: (t) => (
      <span className="text-xs text-muted">{t.assigneeName ?? 'Unassigned'}</span>
    ),
  },
  {
    key: 'sla',
    header: 'SLA',
    width: '130px',
    render: (t) => <SlaTimerBadge deadline={t.slaDeadline} breached={t.slaBreached} />,
  },
  {
    key: 'created',
    header: 'Created',
    width: '120px',
    render: (t) => (
      <span className="font-mono text-[10px] text-muted">
        {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}
      </span>
    ),
  },
]

export function TicketsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('open')
  const [page, setPage] = useState(1)
  const [showNewModal, setShowNewModal] = useState(false)

  const { data, isLoading } = useTickets({
    search: search || undefined,
    status: statusFilter || undefined,
    page,
    pageSize: 20,
  })
  const { data: slaStats, isLoading: slaLoading } = useTicketSlaStats()

  return (
    <div className="space-y-5 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-semibold text-white">Tickets</h1>
          <p className="text-xs text-muted">SLA-tracked support queue</p>
        </div>
        <button onClick={() => setShowNewModal(true)} className="btn-primary">
          <Plus size={13} />
          New Ticket
        </button>
      </div>

      {/* SLA KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Open" value={slaStats?.open ?? '—'} accentColor="#00d4ff" loading={slaLoading} icon={<Clock size={14} />} />
        <KpiCard label="In Progress" value={slaStats?.inProgress ?? '—'} accentColor="#9c7bff" loading={slaLoading} />
        <KpiCard label="At Risk" value={slaStats?.atRisk ?? '—'} accentColor="#ffb300" loading={slaLoading} trend={slaStats?.atRisk ? { value: 'SLA at risk', direction: 'down', positive: false } : undefined} />
        <KpiCard label="Breached" value={slaStats?.breached ?? '—'} accentColor="#ff4d4d" loading={slaLoading} trend={slaStats?.breached ? { value: 'Action needed', direction: 'down', positive: false } : undefined} />
        <KpiCard label="Resolved Today" value={slaStats?.resolvedToday ?? '—'} accentColor="#00e676" loading={slaLoading} trend={{ value: 'Today', direction: 'up' }} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Search tickets, customers…"
          className="w-64"
        />
        <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-1">
          {STATUS_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1) }}
              className={
                statusFilter === f.value
                  ? 'rounded px-2.5 py-1 text-[11px] font-semibold bg-brand/15 text-brand'
                  : 'rounded px-2.5 py-1 text-[11px] text-muted hover:text-white transition-colors'
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <DataTable
          columns={COLUMNS}
          data={data?.data ?? []}
          keyExtractor={(t) => t.id}
          loading={isLoading}
          emptyTitle="No tickets found"
          emptyDescription="All caught up!"
          stickyHeader
        />
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            {data.total} tickets · Page {page} of {data.totalPages}
          </span>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost disabled:opacity-40">← Prev</button>
            <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="btn-ghost disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}

      {showNewModal && <NewTicketModal onClose={() => setShowNewModal(false)} />}
    </div>
  )
}
