import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Users, TrendingUp, Building2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { customersApi } from '@netlayer/api'
import type { Customer } from '@netlayer/api'

function CustomerStatusBadge({ status }: { status: string }) {
  const s = (status ?? '').toUpperCase()
  const color = s === 'ACTIVE' ? 'var(--status-online)' : s === 'SUSPENDED' ? 'var(--status-degraded)' : s === 'CHURNED' ? 'var(--status-offline)' : 'var(--text-muted)'
  return (
    <span className="inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded capitalize"
          style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}>
      {(status ?? '').toLowerCase()}
    </span>
  )
}

function TierBadge({ tier }: { tier?: string }) {
  const color = (tier ?? '').toUpperCase() === 'ENTERPRISE' ? 'var(--status-info)' : 'var(--brand)'
  return (
    <span className="inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
          style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}>
      {tier ?? '—'}
    </span>
  )
}

const INR = (v: number) => `₹${(v / 1000).toFixed(0)}K`

export function CustomersPage() {
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('')

  const { data: raw, isLoading } = useQuery({
    queryKey: ['customers', 'list'],
    queryFn: () => customersApi.list({ pageSize: 200 }),
    staleTime: 60_000,
  })

  const customers = (raw?.data ?? []) as Customer[]

  const filtered = customers.filter(c => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || (c.code ?? '').toLowerCase().includes(search.toLowerCase())
    const matchTier = !tierFilter || (c.tier ?? '').toUpperCase() === tierFilter
    return matchSearch && matchTier
  })

  const totalMrr = customers.reduce((sum, c) => sum + Number(c.monthly_recurring_revenue ?? c.monthlyArv ?? 0), 0)
  const enterpriseCount = customers.filter(c => (c.tier ?? '').toUpperCase() === 'ENTERPRISE').length

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Customers</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>All active enterprise and business accounts</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center"
               style={{ backgroundColor: 'color-mix(in srgb, var(--brand) 12%, transparent)', color: 'var(--brand)' }}>
            <Users size={14} />
          </div>
          <div>
            <p className="font-mono text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{customers.length}</p>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Total Customers</p>
          </div>
        </div>
        <div className="card px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center"
               style={{ backgroundColor: 'color-mix(in srgb, var(--status-info) 12%, transparent)', color: 'var(--status-info)' }}>
            <Building2 size={14} />
          </div>
          <div>
            <p className="font-mono text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{enterpriseCount}</p>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Enterprise</p>
          </div>
        </div>
        <div className="card px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center"
               style={{ backgroundColor: 'color-mix(in srgb, var(--status-online) 12%, transparent)', color: 'var(--status-online)' }}>
            <TrendingUp size={14} />
          </div>
          <div>
            <p className="font-mono text-xl font-bold" style={{ color: 'var(--text-primary)' }}>₹{(totalMrr / 100000).toFixed(1)}L</p>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Monthly MRR</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
          <input className="input-field pl-7 w-56" placeholder="Search customers…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-tab-group">
          {[['', 'All'], ['ENTERPRISE', 'Enterprise'], ['BUSINESS', 'Business']].map(([v, l]) => (
            <button key={v} onClick={() => setTierFilter(v)}
              className={tierFilter === v ? 'filter-tab-active' : 'filter-tab'}>{l}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
              <tr>
                <th className="table-th">Customer</th>
                <th className="table-th">Tier</th>
                <th className="table-th">SLA</th>
                <th className="table-th">Sites</th>
                <th className="table-th">MRR</th>
                <th className="table-th">Account Manager</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="table-row">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="table-td"><div className="skeleton h-4 rounded w-full max-w-[100px]" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No customers found</td></tr>
              ) : (
                filtered.map((c: Customer) => (
                  <tr key={c.id} className="table-row">
                    <td className="table-td">
                      <Link to={`/noc/customers/${c.id}`} className="font-medium text-xs hover:text-white" style={{ color: 'var(--text-primary)' }}>{c.name}</Link>
                      <p className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>{c.code ?? ''}</p>
                    </td>
                    <td className="table-td"><TierBadge tier={c.tier} /></td>
                    <td className="table-td">
                      <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{c.sla_profile ?? '—'}</span>
                    </td>
                    <td className="table-td">
                      <span className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>{c.site_count ?? c.siteCount ?? '—'}</span>
                    </td>
                    <td className="table-td font-mono text-xs" style={{ color: 'var(--status-online)' }}>
                      {INR(Number(c.monthly_recurring_revenue ?? c.monthlyArv ?? 0))}
                    </td>
                    <td className="table-td text-xs" style={{ color: 'var(--text-muted)' }}>
                      {c.account_manager ?? c.accountManagerName ?? '—'}
                    </td>
                    <td className="table-td"><CustomerStatusBadge status={c.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
