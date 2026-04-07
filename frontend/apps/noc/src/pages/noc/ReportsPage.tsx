import { useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { useCustomers, useTicketSlaStats } from '@/hooks/useQueries'
import { KpiCard, Card, DataTable, type Column } from '@netlayer/ui'
import type { Customer } from '@netlayer/api'
import { format, subMonths, startOfMonth } from 'date-fns'

const MONTHS = Array.from({ length: 6 }, (_, i) => {
  const d = subMonths(new Date(), i)
  return format(startOfMonth(d), 'yyyy-MM')
})

function SlaBar({ percent }: { percent: number }) {
  const color = percent >= 99.9 ? '#00e676' : percent >= 99.5 ? '#ffb300' : '#ff4d4d'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-20 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, background: color }} />
      </div>
      <span className="font-mono text-[11px]" style={{ color }}>{percent.toFixed(2)}%</span>
    </div>
  )
}

const COLUMNS: Column<Customer>[] = [
  {
    key: 'name',
    header: 'Customer',
    render: (c) => <p className="font-medium text-white">{c.name}</p>,
  },
  {
    key: 'sites',
    header: 'Sites',
    width: '70px',
    render: (c) => <span className="font-mono text-xs">{c.siteCount}</span>,
  },
  {
    key: 'sla',
    header: 'SLA (30d)',
    width: '160px',
    render: () => <SlaBar percent={99.2 + Math.random() * 0.8} />,
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
    key: 'am',
    header: 'Account Manager',
    render: (c) => <span className="text-xs text-muted">{c.accountManagerName}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    width: '90px',
    render: (c) => (
      <span className={`text-[10px] font-semibold capitalize ${c.status === 'active' ? 'text-status-online' : 'text-status-offline'}`}>
        {c.status}
      </span>
    ),
  },
]

export function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0])
  const { data: customers, isLoading } = useCustomers({ pageSize: 50 })
  const { data: slaStats } = useTicketSlaStats()

  return (
    <div className="space-y-5 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-semibold text-white">SLA Reports</h1>
          <p className="text-xs text-muted">Network-wide service level performance</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost">
            <RefreshCw size={13} />
            Refresh
          </button>
          <button className="btn-ghost">
            <Download size={13} />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Avg Network Uptime" value="99.63%" accentColor="#00e676" trend={{ value: '↑ 0.1%', direction: 'up' }} />
        <KpiCard label="SLA Breaches (30d)" value={slaStats?.breached ?? 0} accentColor="#ff4d4d" trend={slaStats?.breached ? { value: 'Action needed', direction: 'down', positive: false } : { value: 'Clean', direction: 'up' }} />
        <KpiCard label="Tickets Resolved" value={slaStats?.resolvedToday ?? 0} sub="Today" accentColor="#00d4ff" />
        <KpiCard label="Customers Monitored" value={customers?.total ?? 0} accentColor="#9c7bff" />
      </div>

      {/* Month filter */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted">Period:</span>
        <div className="flex gap-1">
          {MONTHS.map(m => (
            <button
              key={m}
              onClick={() => setSelectedMonth(m)}
              className={selectedMonth === m
                ? 'rounded px-2.5 py-1 text-[11px] font-semibold bg-brand/15 text-brand border border-brand/25'
                : 'rounded px-2.5 py-1 text-[11px] text-muted border border-border hover:text-white transition-colors'
              }
            >
              {format(new Date(m + '-01'), 'MMM yy')}
            </button>
          ))}
        </div>
      </div>

      {/* Per-customer SLA table */}
      <Card title="Per-Customer SLA" noPadding>
        <DataTable
          columns={COLUMNS}
          data={customers?.data ?? []}
          keyExtractor={(c) => c.id}
          loading={isLoading}
          emptyTitle="No data"
          stickyHeader
        />
      </Card>

      {/* Grafana SLA embed */}
      <Card title="SLA Trend — Grafana" action={<a href={`${import.meta.env.VITE_GRAFANA_URL ?? '#'}/d/sla-trend`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-brand hover:underline">Open →</a>}>
        <div className="h-64 overflow-hidden rounded-md border border-dashed border-border bg-surface-2 flex items-center justify-center text-xs text-muted">
          {import.meta.env.VITE_GRAFANA_URL
            ? <iframe src={`${import.meta.env.VITE_GRAFANA_URL}/d/sla-trend?theme=dark&kiosk`} className="h-full w-full border-0" title="SLA Trend" />
            : 'Set VITE_GRAFANA_URL to embed SLA trend dashboard'
          }
        </div>
      </Card>
    </div>
  )
}
