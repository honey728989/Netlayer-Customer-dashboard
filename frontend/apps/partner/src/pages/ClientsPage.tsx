import { useState } from 'react'
import { useAuthStore } from '@netlayer/auth'
import { useCustomers } from '@/hooks/useQueries'
import { DataTable, SearchInput, type Column } from '@netlayer/ui'
import type { Customer } from '@netlayer/api'
import { formatDistanceToNow } from 'date-fns'

const STATUS_STYLE: Record<Customer['status'], string> = {
  active: 'bg-status-online/10 text-status-online border-status-online/25',
  suspended: 'bg-status-degraded/10 text-status-degraded border-status-degraded/25',
  churned: 'bg-status-offline/10 text-status-offline border-status-offline/25',
}

const COLUMNS: Column<Customer>[] = [
  {
    key: 'name',
    header: 'Client',
    render: (c) => (
      <div>
        <p className="font-medium text-white">{c.name}</p>
        <p className="text-[10px] text-muted">{c.email}</p>
      </div>
    ),
  },
  {
    key: 'sites',
    header: 'Sites',
    width: '70px',
    render: (c) => <span className="font-mono text-xs">{c.siteCount}</span>,
  },
  {
    key: 'tickets',
    header: 'Open Tickets',
    width: '100px',
    render: (c) => (
      <span className={`font-mono text-xs ${c.activeTickets > 0 ? 'text-status-degraded' : 'text-muted'}`}>
        {c.activeTickets}
      </span>
    ),
  },
  {
    key: 'arr',
    header: 'Monthly ARV',
    width: '130px',
    render: (c) => (
      <span className="font-mono text-xs">
        ₹{(c.monthlyArv / 100).toLocaleString('en-IN')}
      </span>
    ),
  },
  {
    key: 'contract',
    header: 'Contract',
    width: '120px',
    render: (c) => (
      <span className="font-mono text-xs text-muted">
        ₹{(c.contractValue / 100).toLocaleString('en-IN')}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    width: '100px',
    render: (c) => (
      <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_STYLE[c.status]}`}>
        {c.status}
      </span>
    ),
  },
  {
    key: 'since',
    header: 'Customer Since',
    width: '130px',
    render: (c) => (
      <span className="font-mono text-[10px] text-muted">
        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
      </span>
    ),
  },
]

export function ClientsPage() {
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useCustomers({
    partnerId: user?.organizationId,
    search: search || undefined,
    page,
    pageSize: 20,
  })

  const totalARV = data?.data.reduce((sum, c) => sum + c.monthlyArv, 0) ?? 0

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-semibold text-white">My Clients</h1>
          <p className="text-xs text-muted">
            {data?.total ?? 0} clients ·{' '}
            <span className="text-status-online">
              ₹{(totalARV / 100).toLocaleString('en-IN')} / month
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Search clients…"
          className="w-72"
        />
      </div>

      <div className="card overflow-hidden">
        <DataTable
          columns={COLUMNS}
          data={data?.data ?? []}
          keyExtractor={(c) => c.id}
          loading={isLoading}
          emptyTitle="No clients found"
          emptyDescription="Onboard your first client from the pipeline."
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
    </div>
  )
}
