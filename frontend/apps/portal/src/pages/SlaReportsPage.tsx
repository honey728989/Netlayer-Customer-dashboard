import { useState } from 'react'
import { Download, FileText, CheckCircle, XCircle } from 'lucide-react'
import { useAuthStore } from '@netlayer/auth'
import { useQuery } from '@tanstack/react-query'
import { customersApi } from '@netlayer/api'
import { format, subMonths, startOfMonth } from 'date-fns'

const MONTHS = Array.from({ length: 6 }, (_, i) => {
  const d = subMonths(new Date(), i)
  return format(startOfMonth(d), 'yyyy-MM')
})

function UptimeBar({ percent }: { percent: number }) {
  const color =
    percent >= 99.9 ? 'var(--status-online)' :
    percent >= 99.5 ? 'var(--status-degraded)' :
                      'var(--status-offline)'
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-28 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-surface-3)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, percent)}%`, background: color }}
        />
      </div>
      <span className="font-mono text-xs font-semibold tabular-nums" style={{ color }}>
        {percent.toFixed(3)}%
      </span>
    </div>
  )
}

interface SlaMonth {
  month?: string
  period?: string
  uptime_percent?: number
  uptimePercent?: number
  total_downtime_minutes?: number
  totalDowntimeMinutes?: number
  incidents?: number
  credits_issued?: number
  creditsIssued?: number
}

export function SlaReportsPage() {
  const { user } = useAuthStore()
  const customerId = user?.customerId ?? user?.organizationId ?? ''
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0])

  const { data: report, isLoading } = useQuery({
    queryKey: ['customers', customerId, 'sla', selectedMonth],
    queryFn: () => customersApi.getSlaReport(customerId, selectedMonth),
    enabled: Boolean(customerId),
    staleTime: 60_000,
  })

  const summary = (report as any)?.summary ?? {}
  const months: SlaMonth[] = (report as any)?.months ?? []
  const contractedSla = Number(summary.contractedSla ?? summary.contracted_sla ?? 99.5)
  const currentUptime = Number(summary.currentUptime ?? summary.current_uptime ?? 0)
  const creditsOwed = Number(summary.creditsOwed ?? summary.credits_owed ?? 0)
  const meetsTarget = currentUptime >= contractedSla

  return (
    <div className="space-y-5 p-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>SLA Reports</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Service Level Agreement performance history</p>
        </div>
        <button className="btn-ghost gap-1.5">
          <Download size={13} /> Export PDF
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            label: 'Contracted SLA',
            value: isLoading ? '—' : `${contractedSla}%`,
            icon: FileText,
            accent: 'var(--brand)',
          },
          {
            label: 'Current Month',
            value: isLoading ? '—' : (currentUptime ? `${currentUptime.toFixed(3)}%` : '—'),
            icon: meetsTarget ? CheckCircle : XCircle,
            accent: isLoading ? 'var(--text-muted)' : meetsTarget ? 'var(--status-online)' : 'var(--status-offline)',
          },
          {
            label: 'Credits Owed',
            value: isLoading ? '—' : (creditsOwed > 0 ? `₹${creditsOwed.toLocaleString('en-IN')}` : 'None'),
            icon: Download,
            accent: creditsOwed > 0 ? 'var(--status-degraded)' : 'var(--text-muted)',
          },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="metric-card" style={{ borderTop: `2px solid ${accent}` }}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>
                <Icon size={14} />
              </span>
            </div>
            {isLoading ? (
              <div className="skeleton h-7 w-24 rounded" />
            ) : (
              <p className="font-mono text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3">
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Period:</span>
        <div className="filter-tab-group">
          {MONTHS.map(m => (
            <button key={m}
              onClick={() => setSelectedMonth(m)}
              className={selectedMonth === m ? 'filter-tab-active' : 'filter-tab'}>
              {format(new Date(m + '-01'), 'MMM yyyy')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <h3 className="card-title">Monthly SLA Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
              <tr>
                <th className="table-th">Month</th>
                <th className="table-th">Uptime</th>
                <th className="table-th">Downtime</th>
                <th className="table-th">Incidents</th>
                <th className="table-th">Credits</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="table-row">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="table-td"><div className="skeleton h-4 rounded w-full max-w-[100px]" /></td>
                    ))}
                  </tr>
                ))
              ) : months.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    No SLA data for this period
                  </td>
                </tr>
              ) : (
                months.map((m: SlaMonth, i: number) => {
                  const period = m.month ?? m.period ?? ''
                  const uptime = Number(m.uptime_percent ?? m.uptimePercent ?? 0)
                  const downtime = Number(m.total_downtime_minutes ?? m.totalDowntimeMinutes ?? 0)
                  const incidents = Number(m.incidents ?? 0)
                  const credits = Number(m.credits_issued ?? m.creditsIssued ?? 0)

                  return (
                    <tr key={period || i} className="table-row">
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <FileText size={12} style={{ color: 'var(--text-dim)' }} className="shrink-0" />
                          <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                            {period ? format(new Date(period + '-01'), 'MMMM yyyy') : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="table-td w-52">
                        {uptime > 0 ? <UptimeBar percent={uptime} /> : <span style={{ color: 'var(--text-dim)' }} className="text-xs">—</span>}
                      </td>
                      <td className="table-td">
                        <span className="font-mono text-xs" style={{ color: downtime > 0 ? 'var(--status-offline)' : 'var(--text-muted)' }}>
                          {downtime > 0 ? `${downtime}m` : '0'}
                        </span>
                      </td>
                      <td className="table-td">
                        <span className="font-mono text-xs" style={{ color: incidents > 0 ? 'var(--status-degraded)' : 'var(--text-muted)' }}>
                          {incidents}
                        </span>
                      </td>
                      <td className="table-td">
                        {credits > 0 ? (
                          <span className="inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
                                style={{ color: 'var(--status-online)', backgroundColor: 'color-mix(in srgb, var(--status-online) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--status-online) 25%, transparent)' }}>
                            ₹{credits.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>—</span>
                        )}
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
