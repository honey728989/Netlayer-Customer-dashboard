import { useState } from 'react'
import { IndianRupee, TrendingUp } from 'lucide-react'
import { useAuthStore } from '@netlayer/auth'
import { usePartnerCommissions, usePartnerStats } from '@/hooks/useQueries'
import { KpiCard, DataTable, type Column } from '@netlayer/ui'
import type { Commission } from '@netlayer/api'

const STATUS_STYLE: Record<Commission['status'], string> = {
  pending: 'bg-surface-2 text-muted border-border',
  approved: 'bg-brand/10 text-brand border-brand/25',
  paid: 'bg-status-online/10 text-status-online border-status-online/25',
}

const COLUMNS: Column<Commission>[] = [
  {
    key: 'month',
    header: 'Period',
    width: '100px',
    render: (c) => <span className="font-mono text-xs font-medium">{c.month}</span>,
  },
  {
    key: 'revenue',
    header: 'Client Revenue',
    width: '140px',
    render: (c) => (
      <span className="font-mono text-xs">
        ₹{(c.totalRevenue / 100).toLocaleString('en-IN')}
      </span>
    ),
  },
  {
    key: 'rate',
    header: 'Rate',
    width: '80px',
    render: (c) => (
      <span className="font-mono text-xs text-muted">{c.commissionRate}%</span>
    ),
  },
  {
    key: 'amount',
    header: 'Commission Earned',
    width: '160px',
    render: (c) => (
      <span className="font-mono text-sm font-medium text-status-online">
        ₹{(c.commissionAmount / 100).toLocaleString('en-IN')}
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
    key: 'paidAt',
    header: 'Paid On',
    width: '120px',
    render: (c) => (
      <span className="font-mono text-[10px] text-muted">
        {c.paidAt ? new Date(c.paidAt).toLocaleDateString('en-IN') : '—'}
      </span>
    ),
  },
]

export function CommissionsPage() {
  const { user } = useAuthStore()
  const partnerId = user?.organizationId ?? ''
  const [page, setPage] = useState(1)

  const { data, isLoading } = usePartnerCommissions(partnerId, { page, pageSize: 12, sortBy: 'month', sortOrder: 'desc' })
  const { data: stats, isLoading: statsLoading } = usePartnerStats(partnerId)

  const totalPending = data?.data.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.commissionAmount, 0) ?? 0
  const totalApproved = data?.data.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.commissionAmount, 0) ?? 0
  const totalPaid = data?.data.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.commissionAmount, 0) ?? 0

  return (
    <div className="space-y-5 p-5">
      <div>
        <h1 className="font-display text-lg font-semibold text-white">Commissions</h1>
        <p className="text-xs text-muted">Monthly payout history and status</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          label="Pending"
          value={`₹${(totalPending / 100).toLocaleString('en-IN')}`}
          sub="Awaiting approval"
          accentColor="#ffb300"
          icon={<IndianRupee size={14} />}
        />
        <KpiCard
          label="Approved"
          value={`₹${(totalApproved / 100).toLocaleString('en-IN')}`}
          sub="Being processed"
          accentColor="#00d4ff"
        />
        <KpiCard
          label="Paid (shown period)"
          value={`₹${(totalPaid / 100).toLocaleString('en-IN')}`}
          sub="Transferred"
          accentColor="#00e676"
          trend={{ value: 'On time', direction: 'up' }}
        />
        <KpiCard
          label="Total Pending (all time)"
          value={stats ? `₹${(stats.pendingCommission / 100).toLocaleString('en-IN')}` : '—'}
          loading={statsLoading}
          accentColor="#9c7bff"
          icon={<TrendingUp size={14} />}
        />
      </div>

      {/* Commission tier info */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="card-title mb-3">Commission Tiers</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { tier: 'Silver', range: '₹0 – ₹5L/mo', rate: '8%', color: '#aaa' },
            { tier: 'Gold', range: '₹5L – ₹20L/mo', rate: '10%', color: '#ffb300' },
            { tier: 'Platinum', range: '₹20L+/mo', rate: '12%', color: '#00d4ff' },
          ].map(({ tier, range, rate, color }) => (
            <div key={tier} className="rounded-md border border-border bg-surface-2 p-3">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
                <span className="text-xs font-semibold" style={{ color }}>{tier}</span>
              </div>
              <p className="mt-1 font-mono text-base font-medium text-white">{rate}</p>
              <p className="text-[10px] text-muted">{range}</p>
            </div>
          ))}
        </div>
      </div>

      {/* History table */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <span className="card-title">Payout History</span>
          <span className="text-[11px] text-muted">{data?.total ?? 0} records</span>
        </div>
        <DataTable
          columns={COLUMNS}
          data={data?.data ?? []}
          keyExtractor={(c) => c.id}
          loading={isLoading}
          emptyTitle="No commission records yet"
          emptyDescription="Commission is calculated monthly based on client revenue."
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
