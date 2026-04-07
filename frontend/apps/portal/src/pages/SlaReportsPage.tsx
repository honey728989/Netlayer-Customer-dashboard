import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { useAuthStore } from '@netlayer/auth'
import { useQuery } from '@tanstack/react-query'
import { customersApi } from '@netlayer/api'
import { queryKeys } from '@/services/queryClient'
import { Card, PageLoader } from '@netlayer/ui'
import { format, subMonths, startOfMonth } from 'date-fns'

interface SlaMonth {
  month: string
  uptimePercent: number
  totalDowntimeMinutes: number
  incidents: number
  creditsIssued: number
}

const MONTHS = Array.from({ length: 6 }, (_, i) => {
  const d = subMonths(new Date(), i)
  return format(startOfMonth(d), 'yyyy-MM')
})

function UptimeBar({ percent }: { percent: number }) {
  const color = percent >= 99.9 ? '#00e676' : percent >= 99.5 ? '#ffb300' : '#ff4d4d'
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, background: color }} />
      </div>
      <span className="font-mono text-xs font-medium min-w-[46px] text-right" style={{ color }}>
        {percent.toFixed(2)}%
      </span>
    </div>
  )
}

export function SlaReportsPage() {
  const { user } = useAuthStore()
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0])

  const { data: report, isLoading } = useQuery({
    queryKey: queryKeys.customers.sla(user?.organizationId ?? '', selectedMonth),
    queryFn: () => customersApi.getSlaReport(user?.organizationId ?? '', selectedMonth),
    enabled: Boolean(user?.organizationId),
  })

  if (isLoading) return <PageLoader />

  const months: SlaMonth[] = report?.months ?? []
  const summary = report?.summary ?? { contractedSla: 99.5, currentUptime: 0, creditsOwed: 0 }

  return (
    <div className="space-y-5 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-semibold text-white">SLA Reports</h1>
          <p className="text-xs text-muted">Service Level Agreement performance history</p>
        </div>
        <button className="btn-ghost">
          <Download size={13} />
          Export PDF
        </button>
      </div>

      {/* SLA summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Contracted SLA', value: `${summary.contractedSla}%`, color: '#00d4ff' },
          { label: 'Current Month Uptime', value: `${summary.currentUptime?.toFixed(3) ?? '—'}%`, color: summary.currentUptime >= summary.contractedSla ? '#00e676' : '#ff4d4d' },
          { label: 'Credits Owed', value: summary.creditsOwed > 0 ? `₹${(summary.creditsOwed / 100).toLocaleString('en-IN')}` : 'None', color: summary.creditsOwed > 0 ? '#ffb300' : '#6b7a99' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted">{label}</p>
            <p className="mt-1 font-mono text-xl font-medium" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted">View month:</span>
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
              {format(new Date(m + '-01'), 'MMM yyyy')}
            </button>
          ))}
        </div>
      </div>

      {/* Monthly uptime table */}
      <Card title="Monthly SLA Performance" noPadding>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              {['Month', 'Uptime', 'Downtime', 'Incidents', 'Credits'].map(h => (
                <th key={h} className="table-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {months.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-xs text-muted">
                  No SLA data for this period
                </td>
              </tr>
            )}
            {months.map((m) => (
              <tr key={m.month} className="table-row">
                <td className="table-td">
                  <div className="flex items-center gap-2">
                    <FileText size={12} className="text-muted" />
                    <span className="font-mono text-xs">{format(new Date(m.month + '-01'), 'MMMM yyyy')}</span>
                  </div>
                </td>
                <td className="table-td w-52">
                  <UptimeBar percent={m.uptimePercent} />
                </td>
                <td className="table-td">
                  <span className={`font-mono text-xs ${m.totalDowntimeMinutes > 0 ? 'text-status-offline' : 'text-muted'}`}>
                    {m.totalDowntimeMinutes > 0 ? `${m.totalDowntimeMinutes}m` : '0'}
                  </span>
                </td>
                <td className="table-td">
                  <span className={`font-mono text-xs ${m.incidents > 0 ? 'text-status-degraded' : 'text-muted'}`}>
                    {m.incidents}
                  </span>
                </td>
                <td className="table-td">
                  {m.creditsIssued > 0
                    ? <span className="font-mono text-xs text-status-online">₹{(m.creditsIssued / 100).toLocaleString('en-IN')}</span>
                    : <span className="text-[10px] text-muted">—</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
