import { useState } from 'react'
import { useCustomers } from '@/hooks/useQueries'
import { DataTable, SearchInput, type Column } from '@netlayer/ui'
import type { Customer } from '@netlayer/api'

const STATUS_STYLE: Record<Customer['status'], string> = {
  active: 'bg-status-online/10 text-status-online border-status-online/25',
  suspended: 'bg-status-degraded/10 text-status-degraded border-status-degraded/25',
  churned: 'bg-status-offline/10 text-status-offline border-status-offline/25',
}

const COLUMNS: Column<Customer>[] = [
  {
    key: 'name',
    header: 'Customer',
    render: (c) => (
      <div>
        <p className="font-medium text-white">{c.name}</p>
        <p className="font-mono text-[10px] text-muted">{c.gstin}</p>
      </div>
    ),
  },
  { key: 'sites', header: 'Sites', width: '70px', render: (c) => <span className="font-mono text-xs">{c.siteCount}</span> },
  { key: 'tickets', header: 'Open Tickets', width: '100px', render: (c) => <span className={`font-mono text-xs ${c.activeTickets > 0 ? 'text-status-degraded' : 'text-muted'}`}>{c.activeTickets}</span> },
  { key: 'arr', header: 'Monthly ARV', width: '130px', render: (c) => <span className="font-mono text-xs">₹{(c.monthlyArv / 100).toLocaleString('en-IN')}</span> },
  { key: 'am', header: 'Account Manager', render: (c) => <span className="text-xs text-muted">{c.accountManagerName}</span> },
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
]

export function CustomersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { data, isLoading } = useCustomers({ search: search || undefined, page, pageSize: 20 })

  return (
    <div className="space-y-4 p-5">
      <div>
        <h1 className="font-display text-lg font-semibold text-white">Customers</h1>
        <p className="text-xs text-muted">{data?.total ?? 0} enterprise customers</p>
      </div>

      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search customers, GSTIN…" className="w-72" />
      </div>

      <div className="card overflow-hidden">
        <DataTable
          columns={COLUMNS}
          data={data?.data ?? []}
          keyExtractor={(c) => c.id}
          loading={isLoading}
          emptyTitle="No customers found"
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
