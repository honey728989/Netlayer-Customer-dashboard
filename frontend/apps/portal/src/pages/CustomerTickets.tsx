import { useState } from 'react'
import { Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuthStore } from '@netlayer/auth'
import { useTickets } from '@/hooks/useQueries'
import { DataTable, SearchInput, SlaTimerBadge, TicketPriorityBadge, type Column } from '@netlayer/ui'
import { NewTicketModal } from '@/components/tickets/NewTicketModal'
import type { Ticket, TicketStatus } from '@netlayer/api'

const STATUS_STYLE: Record<TicketStatus, string> = {
  open: 'bg-brand/10 text-brand border border-brand/25',
  in_progress: 'bg-status-info/10 text-status-info border border-status-info/25',
  pending: 'bg-status-degraded/10 text-status-degraded border border-status-degraded/25',
  resolved: 'bg-status-online/10 text-status-online border border-status-online/25',
  closed: 'bg-surface-2 text-muted border border-border',
}

const STATUS_OPTIONS: Array<{ label: string; value: TicketStatus | '' }> = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
]

const COLUMNS: Column<Ticket>[] = [
  {
    key: 'id',
    header: 'ID',
    width: '80px',
    render: (t) => <span className="font-mono text-[11px] text-muted">#{t.id.slice(-5)}</span>,
  },
  {
    key: 'subject',
    header: 'Subject',
    render: (t) => (
      <div>
        <p className="font-medium text-white">{t.subject}</p>
        {t.siteName && <p className="text-[10px] text-muted">{t.siteName}</p>}
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
    render: (t) => (
      <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_STYLE[t.status]}`}>
        {t.status.replace('_', ' ')}
      </span>
    ),
  },
  {
    key: 'sla',
    header: 'SLA',
    width: '130px',
    render: (t) => <SlaTimerBadge deadline={t.slaDeadline} breached={t.slaBreached} />,
  },
  {
    key: 'updated',
    header: 'Last Updated',
    width: '130px',
    render: (t) => (
      <span className="font-mono text-[10px] text-muted">
        {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}
      </span>
    ),
  },
]

export function CustomerTickets() {
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('open')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)

  const { data, isLoading } = useTickets({
    customerId: user?.organizationId,
    search: search || undefined,
    status: statusFilter || undefined,
    page,
    pageSize: 20,
  })

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-semibold text-white">Support Tickets</h1>
          <p className="text-xs text-muted">{data?.total ?? 0} tickets</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={13} />
          Raise Ticket
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Search tickets…"
          className="w-64"
        />
        <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-1">
          {STATUS_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1) }}
              className={statusFilter === f.value
                ? 'rounded px-2.5 py-1 text-[11px] font-semibold bg-brand/15 text-brand'
                : 'rounded px-2.5 py-1 text-[11px] text-muted hover:text-white transition-colors'
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <DataTable
          columns={COLUMNS}
          data={data?.data ?? []}
          keyExtractor={(t) => t.id}
          loading={isLoading}
          emptyTitle="No tickets found"
          emptyDescription="All issues resolved! Raise a ticket if you need help."
          stickyHeader
        />
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Page {page} of {data.totalPages}</span>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-ghost disabled:opacity-40">← Prev</button>
            <button disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)} className="btn-ghost disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}

      {showModal && (
        <NewTicketModal
          onClose={() => setShowModal(false)}
          defaultCustomerId={user?.organizationId}
        />
      )}
    </div>
  )
}
