import { useState } from 'react'
import { Search, Users } from 'lucide-react'
import { useAuthStore } from '@netlayer/auth'
import { useQuery } from '@tanstack/react-query'
import { partnersApi } from '@netlayer/api'
import type { Customer } from '@netlayer/api'
import { formatDistanceToNow } from 'date-fns'

const INR = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)

function statusColor(status: string) {
  const s = (status ?? '').toUpperCase()
  if (s === 'ACTIVE')    return 'var(--status-online)'
  if (s === 'SUSPENDED') return 'var(--status-degraded)'
  if (s === 'CHURNED')   return 'var(--status-offline)'
  return 'var(--text-muted)'
}

function mrr(c: Customer) {
  return Number(c.monthly_recurring_revenue ?? c.monthlyArv ?? 0)
}

export function ClientsPage() {
  const { user } = useAuthStore()
  const partnerId = user?.partnerId ?? user?.organizationId ?? ''
  const [search, setSearch] = useState('')

  const { data: raw, isLoading } = useQuery({
    queryKey: ['partners', partnerId, 'customers'],
    queryFn: () => partnersApi.getCustomers(partnerId),
    enabled: Boolean(partnerId),
    staleTime: 60_000,
  })

  const customers = (Array.isArray(raw) ? raw : (raw as any)?.data ?? []) as Customer[]
  const filtered = customers.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )
  const totalMrr = customers.reduce((sum, c) => sum + mrr(c), 0)

  return (
    <div className="space-y-5 p-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>My Clients</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {customers.length} clients ·{' '}
            <span style={{ color: 'var(--status-online)' }}>{INR(totalMrr)} / month</span>
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-72">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
        <input className="input-field pl-7 w-full" placeholder="Search clients…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
              <tr>
                <th className="table-th">Client</th>
                <th className="table-th">Tier</th>
                <th className="table-th">Sites</th>
                <th className="table-th">MRR</th>
                <th className="table-th">Status</th>
                <th className="table-th">Customer Since</th>
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
                    <Users size={24} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs">{search ? 'No clients match your search' : 'No clients yet'}</p>
                  </td>
                </tr>
              ) : (
                filtered.map((c: Customer) => {
                  const color = statusColor(c.status)
                  const createdAt = c.created_at ?? c.createdAt
                  return (
                    <tr key={c.id} className="table-row">
                      <td className="table-td">
                        <p className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                        <p className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>{c.email ?? c.code ?? ''}</p>
                      </td>
                      <td className="table-td">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                              style={{ color: 'var(--brand)', backgroundColor: 'color-mix(in srgb, var(--brand) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--brand) 20%, transparent)' }}>
                          {c.tier ?? '—'}
                        </span>
                      </td>
                      <td className="table-td font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                        {c.site_count ?? c.siteCount ?? '—'}
                      </td>
                      <td className="table-td font-mono text-xs" style={{ color: 'var(--status-online)' }}>
                        {INR(mrr(c))}
                      </td>
                      <td className="table-td">
                        <span className="inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded capitalize"
                              style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}>
                          {(c.status ?? '').toLowerCase()}
                        </span>
                      </td>
                      <td className="table-td font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {createdAt
                          ? formatDistanceToNow(new Date(createdAt), { addSuffix: true })
                          : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
