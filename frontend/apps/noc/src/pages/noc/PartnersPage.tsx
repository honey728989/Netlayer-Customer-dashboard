import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { partnersApi } from '@netlayer/api'
import type { Partner } from '@netlayer/api'

const INR = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)

function TierBadge({ tier }: { tier?: string }) {
  const t = (tier ?? '').toUpperCase()
  const color = t === 'PLATINUM' ? 'var(--brand)' : t === 'GOLD' ? 'var(--status-degraded)' : 'var(--text-muted)'
  return (
    <span className="inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded capitalize"
          style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}>
      {(tier ?? 'Standard').toLowerCase()}
    </span>
  )
}

const PAGE_SIZE = 20

export function PartnersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data: raw, isLoading } = useQuery({
    queryKey: ['partners', 'list', search, page],
    queryFn: () => partnersApi.list({ search: search || undefined, page, pageSize: PAGE_SIZE }),
    staleTime: 60_000,
  })

  // partnersApi.list now returns PaginatedResponse<Partner>
  const partners = (raw?.data ?? []) as Partner[]
  const total = raw?.total ?? 0
  const totalPages = raw?.totalPages ?? 1

  const totalRevenue = partners.reduce((s, p) => s + Number(p.monthly_revenue ?? p.monthlyRevenue ?? 0), 0)

  return (
    <div className="space-y-5 p-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Channel Partners</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {total} partners{totalRevenue > 0 ? ` · ${INR(totalRevenue)} / month` : ''}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-72">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
        <input className="input-field pl-7 w-full" placeholder="Search partners, cities…"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
              <tr>
                <th className="table-th">Partner</th>
                <th className="table-th">Tier</th>
                <th className="table-th">Clients</th>
                <th className="table-th">Monthly Revenue</th>
                <th className="table-th">Pending Commission</th>
                <th className="table-th">Active Leads</th>
                <th className="table-th">Partner Since</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="table-row">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="table-td"><div className="skeleton h-4 rounded w-full max-w-[100px]" /></td>
                    ))}
                  </tr>
                ))
              ) : partners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No partners found</td>
                </tr>
              ) : (
                partners.map((p: Partner) => {
                  const revenue = Number(p.monthly_revenue ?? p.monthlyRevenue ?? 0)
                  const pendingComm = Number(p.pendingCommission ?? 0)
                  const activeLeads = p.activeLeads ?? '—'
                  const clientCount = p.customer_count ?? p.clientCount ?? '—'
                  const createdAt = p.created_at ?? p.createdAt

                  return (
                    <tr key={p.id} className="table-row">
                      <td className="table-td">
                        <Link to={`/noc/partners/${p.id}`} className="font-medium text-xs hover:text-white" style={{ color: 'var(--text-primary)' }}>{p.name}</Link>
                        <p className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
                          {[p.email, p.city].filter(Boolean).join(' · ')}
                        </p>
                      </td>
                      <td className="table-td"><TierBadge tier={p.tier} /></td>
                      <td className="table-td font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{clientCount}</td>
                      <td className="table-td font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                        {INR(revenue)}
                      </td>
                      <td className="table-td font-mono text-xs" style={{ color: pendingComm > 0 ? 'var(--status-degraded)' : 'var(--text-muted)' }}>
                        {INR(pendingComm)}
                      </td>
                      <td className="table-td font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{activeLeads}</td>
                      <td className="table-td font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {createdAt ? new Date(createdAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="font-mono text-[11px]" style={{ color: 'var(--text-dim)' }}>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-ghost h-7 w-7 p-0 justify-center disabled:opacity-30">‹</button>
              <span className="font-mono text-[11px] min-w-[3rem] text-center" style={{ color: 'var(--text-muted)' }}>{page}/{totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-ghost h-7 w-7 p-0 justify-center disabled:opacity-30">›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
