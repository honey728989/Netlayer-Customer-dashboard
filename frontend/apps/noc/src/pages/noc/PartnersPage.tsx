import { useState } from 'react'
import { usePartners } from '@/hooks/useQueries'
import { DataTable, SearchInput, type Column } from '@netlayer/ui'
import type { Partner } from '@netlayer/api'

const TIER_STYLE: Record<Partner['tier'], string> = {
  silver: 'text-[#aaa] bg-[#aaa]/10 border-[#aaa]/25',
  gold: 'text-status-degraded bg-status-degraded/10 border-status-degraded/25',
  platinum: 'text-brand bg-brand/10 border-brand/25',
}

const COLUMNS: Column<Partner>[] = [
  {
    key: 'name',
    header: 'Partner',
    render: (p) => (
      <div>
        <p className="font-medium text-white">{p.name}</p>
        <p className="text-[10px] text-muted">{p.email} · {p.city}</p>
      </div>
    ),
  },
  {
    key: 'tier',
    header: 'Tier',
    width: '90px',
    render: (p) => (
      <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold capitalize ${TIER_STYLE[p.tier]}`}>
        {p.tier}
      </span>
    ),
  },
  {
    key: 'clients',
    header: 'Clients',
    width: '80px',
    render: (p) => <span className="font-mono text-xs">{p.clientCount}</span>,
  },
  {
    key: 'revenue',
    header: 'Monthly Revenue',
    width: '150px',
    render: (p) => (
      <span className="font-mono text-xs">
        ₹{(p.monthlyRevenue / 100).toLocaleString('en-IN')}
      </span>
    ),
  },
  {
    key: 'commission',
    header: 'Pending Commission',
    width: '160px',
    render: (p) => (
      <span className={`font-mono text-xs ${p.pendingCommission > 0 ? 'text-status-degraded' : 'text-muted'}`}>
        ₹{(p.pendingCommission / 100).toLocaleString('en-IN')}
      </span>
    ),
  },
  {
    key: 'leads',
    header: 'Active Leads',
    width: '100px',
    render: (p) => <span className="font-mono text-xs text-muted">{p.activeLeads}</span>,
  },
  {
    key: 'since',
    header: 'Partner Since',
    width: '120px',
    render: (p) => (
      <span className="font-mono text-[10px] text-muted">
        {new Date(p.createdAt).toLocaleDateString('en-IN')}
      </span>
    ),
  },
]

export function PartnersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = usePartners({
    search: search || undefined,
    page,
    pageSize: 20,
  })

  const totalRevenue = data?.data.reduce((s, p) => s + p.monthlyRevenue, 0) ?? 0

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-semibold text-white">Channel Partners</h1>
          <p className="text-xs text-muted">
            {data?.total ?? 0} partners ·{' '}
            <span className="text-status-online">
              ₹{(totalRevenue / 100).toLocaleString('en-IN')} / month total
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Search partners, cities…"
          className="w-72"
        />
      </div>

      <div className="card overflow-hidden">
        <DataTable
          columns={COLUMNS}
          data={data?.data ?? []}
          keyExtractor={(p) => p.id}
          loading={isLoading}
          emptyTitle="No partners found"
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
