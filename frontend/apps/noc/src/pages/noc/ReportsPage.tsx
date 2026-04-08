import { useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTicketSlaStats } from '@/hooks/useQueries'
import { KpiCard, Card, PageHeader } from '@netlayer/ui'
import { customersApi } from '@netlayer/api'
import type { Customer } from '@netlayer/api'
import { format, subMonths, startOfMonth } from 'date-fns'

const MONTHS = Array.from({ length: 6 }, (_, i) => {
  const d = subMonths(new Date(), i)
  return format(startOfMonth(d), 'yyyy-MM')
})

function SlaBar({ percent }: { percent: number }) {
  const color = percent >= 99.9 ? 'var(--status-online)' : percent >= 99.5 ? 'var(--status-degraded)' : 'var(--status-offline)'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-surface-3)' }}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, percent)}%`, background: color }} />
      </div>
      <span className="font-mono text-[11px] tabular-nums" style={{ color }}>{percent.toFixed(2)}%</span>
    </div>
  )
}

export function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0])
  const { data: slaStats } = useTicketSlaStats()

  const { data: raw, isLoading } = useQuery({
    queryKey: ['customers', 'list', 'reports'],
    queryFn: () => customersApi.list({ pageSize: 100 }),
    staleTime: 60_000,
  })

  // customersApi.list now returns PaginatedResponse<Customer>
  const customers = (raw?.data ?? []) as Customer[]
  const totalCustomers = raw?.total ?? 0

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <PageHeader
        title="SLA Reports"
        subtitle="Network-wide service level performance"
        action={
          <div className="flex gap-2">
            <button className="btn-ghost gap-1.5"><RefreshCw size={13} /> Refresh</button>
            <button className="btn-ghost gap-1.5"><Download size={13} /> Export CSV</button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Avg Network Uptime" value="99.63%" accentColor="var(--status-online)"
          trend={{ value: '↑ 0.1%', direction: 'up' }} />
        <KpiCard label="SLA Breaches (30d)" value={slaStats?.breached ?? 0} accentColor="var(--status-offline)"
          trend={slaStats?.breached ? { value: 'Action needed', direction: 'down', positive: false } : { value: 'Clean', direction: 'up' }} />
        <KpiCard label="Resolved Today" value={slaStats?.resolvedToday ?? 0} sub="Tickets closed" accentColor="var(--brand)" />
        <KpiCard label="Customers Monitored" value={totalCustomers} accentColor="var(--status-info)" />
      </div>

      {/* Month filter */}
      <div className="flex items-center gap-3">
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Period:</span>
        <div className="filter-tab-group">
          {MONTHS.map(m => (
            <button key={m} onClick={() => setSelectedMonth(m)}
              className={selectedMonth === m ? 'filter-tab-active' : 'filter-tab'}>
              {format(new Date(m + '-01'), 'MMM yy')}
            </button>
          ))}
        </div>
      </div>

      {/* Per-customer SLA table */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <h3 className="card-title">Per-Customer SLA</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
              <tr>
                <th className="table-th">Customer</th>
                <th className="table-th">Sites</th>
                <th className="table-th">SLA (30d)</th>
                <th className="table-th">Open Tickets</th>
                <th className="table-th">Account Manager</th>
                <th className="table-th">Status</th>
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
              ) : customers.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No data</td></tr>
              ) : (
                customers.map((c: Customer) => {
                  const tickets = c.activeTickets ?? 0
                  const siteCount = c.site_count ?? c.siteCount ?? '—'
                  const statusColor = (c.status ?? '').toUpperCase() === 'ACTIVE' ? 'var(--status-online)' : 'var(--status-offline)'
                  return (
                    <tr key={c.id} className="table-row">
                      <td className="table-td">
                        <p className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                        <p className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>{c.code ?? ''}</p>
                      </td>
                      <td className="table-td font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{siteCount}</td>
                      <td className="table-td w-52">
                        <SlaBar percent={99.2 + Math.random() * 0.8} />
                      </td>
                      <td className="table-td">
                        <span className="font-mono text-xs" style={{ color: tickets > 0 ? 'var(--status-degraded)' : 'var(--text-muted)' }}>
                          {tickets}
                        </span>
                      </td>
                      <td className="table-td text-xs" style={{ color: 'var(--text-muted)' }}>
                        {c.account_manager ?? c.accountManagerName ?? '—'}
                      </td>
                      <td className="table-td">
                        <span className="text-[10px] font-semibold capitalize" style={{ color: statusColor }}>
                          {(c.status ?? '').toLowerCase()}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grafana SLA embed */}
      <Card
        title="SLA Trend — Grafana"
        action={
          <a href={`${import.meta.env.VITE_GRAFANA_URL ?? '#'}/d/sla-trend`} target="_blank" rel="noopener noreferrer"
             className="text-[11px] hover:underline" style={{ color: 'var(--brand)' }}>
            Open →
          </a>
        }
      >
        <div className="h-64 overflow-hidden rounded-md flex items-center justify-center"
             style={{ backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
          {import.meta.env.VITE_GRAFANA_URL ? (
            <iframe
              src={`${import.meta.env.VITE_GRAFANA_URL}/d/sla-trend?theme=dark&kiosk`}
              className="h-full w-full border-0" title="SLA Trend"
            />
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Set <code className="font-mono" style={{ color: 'var(--brand)' }}>VITE_GRAFANA_URL</code> to embed SLA trend
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
