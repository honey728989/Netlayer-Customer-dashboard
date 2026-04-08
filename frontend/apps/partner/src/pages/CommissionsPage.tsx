import { useState } from 'react'
import { IndianRupee, TrendingUp } from 'lucide-react'
import { useAuthStore } from '@netlayer/auth'
import { useQuery } from '@tanstack/react-query'
import { partnersApi } from '@netlayer/api'
import type { Commission } from '@netlayer/api'

const INR = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)

function commPeriod(c: Commission)  { return c.commission_period ?? c.month ?? '—' }
function commRevenue(c: Commission) { return Number(c.gross_revenue ?? c.totalRevenue ?? 0) }
function commRate(c: Commission)    { return Number(c.commission_rate ?? c.commissionRate ?? 0) }
function commAmount(c: Commission)  { return Number(c.commission_amount ?? c.commissionAmount ?? 0) }
function commPaid(c: Commission)    { return c.paid_at ?? c.paidAt }

function StatusBadge({ status }: { status: string }) {
  const s = (status ?? '').toLowerCase()
  const color = s === 'paid' ? 'var(--status-online)' : s === 'approved' ? 'var(--brand)' : 'var(--text-muted)'
  return (
    <span className="inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded capitalize"
          style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}>
      {s}
    </span>
  )
}

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent: string
}) {
  return (
    <div className="metric-card" style={{ borderTop: `2px solid ${accent}` }}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>
          <Icon size={14} />
        </span>
      </div>
      <p className="font-mono text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {sub && <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  )
}

const PAGE_SIZE = 12

export function CommissionsPage() {
  const { user } = useAuthStore()
  const partnerId = user?.partnerId ?? user?.organizationId ?? ''
  const [page, setPage] = useState(1)

  const { data: raw, isLoading } = useQuery({
    queryKey: ['partners', partnerId, 'commissions', page],
    queryFn: () => partnersApi.getCommissions(partnerId, { page, pageSize: PAGE_SIZE }),
    enabled: Boolean(partnerId),
    staleTime: 60_000,
  })

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['partners', partnerId, 'stats'],
    queryFn: () => partnersApi.getDashboardStats(partnerId),
    enabled: Boolean(partnerId),
    staleTime: 30_000,
  })

  const records = (Array.isArray(raw) ? raw : (raw as any)?.data ?? []) as Commission[]
  const total = (raw as any)?.total ?? records.length
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const totalPending  = records.filter(c => (c.status ?? '').toLowerCase() === 'pending').reduce((s, c) => s + commAmount(c), 0)
  const totalApproved = records.filter(c => (c.status ?? '').toLowerCase() === 'approved').reduce((s, c) => s + commAmount(c), 0)
  const totalPaid     = records.filter(c => (c.status ?? '').toLowerCase() === 'paid').reduce((s, c) => s + commAmount(c), 0)
  const s = stats as any
  const allPending    = Number(s?.pendingCommission ?? s?.pending_commission ?? 0)

  return (
    <div className="space-y-5 p-5 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Commissions</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Monthly payout history and status</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Pending" value={INR(totalPending)} sub="Awaiting approval" icon={IndianRupee} accent="var(--status-degraded)" />
        <StatCard label="Approved" value={INR(totalApproved)} sub="Being processed" icon={TrendingUp} accent="var(--brand)" />
        <StatCard label="Paid (shown)" value={INR(totalPaid)} sub="Transferred" icon={IndianRupee} accent="var(--status-online)" />
        <StatCard label="Total Pending" value={statsLoading ? '—' : INR(allPending)} sub="All months" icon={TrendingUp} accent="var(--status-info)" />
      </div>

      {/* Tiers */}
      <div className="card p-4">
        <p className="card-title mb-3">Commission Tiers</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { tier: 'Silver',   range: '₹0 – ₹5L/mo',   rate: '8%',  color: '#9ca3af' },
            { tier: 'Gold',     range: '₹5L – ₹20L/mo', rate: '10%', color: 'var(--status-degraded)' },
            { tier: 'Platinum', range: '₹20L+/mo',       rate: '12%', color: 'var(--brand)' },
          ].map(({ tier, range, rate, color }) => (
            <div key={tier} className="rounded-md p-3" style={{ backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                <span className="text-xs font-semibold" style={{ color }}>{tier}</span>
              </div>
              <p className="mt-1.5 font-mono text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{rate}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{range}</p>
            </div>
          ))}
        </div>
      </div>

      {/* History table */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <span className="card-title">Payout History</span>
          <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>{total} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
              <tr>
                <th className="table-th">Period</th>
                <th className="table-th">Client Revenue</th>
                <th className="table-th">Rate</th>
                <th className="table-th">Commission</th>
                <th className="table-th">Status</th>
                <th className="table-th">Paid On</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="table-row">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="table-td"><div className="skeleton h-4 rounded w-full max-w-[100px]" /></td>
                    ))}
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    No commission records yet
                  </td>
                </tr>
              ) : (
                records.map(c => (
                  <tr key={c.id} className="table-row">
                    <td className="table-td">
                      <span className="font-mono text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{commPeriod(c)}</span>
                    </td>
                    <td className="table-td font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                      {INR(commRevenue(c))}
                    </td>
                    <td className="table-td font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                      {commRate(c)}%
                    </td>
                    <td className="table-td">
                      <span className="font-mono text-sm font-semibold" style={{ color: 'var(--status-online)' }}>
                        {INR(commAmount(c))}
                      </span>
                    </td>
                    <td className="table-td">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="table-td font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {commPaid(c) ? new Date(commPaid(c)!).toLocaleDateString('en-IN') : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="font-mono text-[11px]" style={{ color: 'var(--text-dim)' }}>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex items-center gap-1">
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
