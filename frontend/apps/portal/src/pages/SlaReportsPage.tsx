import { useMemo, useState } from 'react'
import { Download, FileText, CheckCircle, XCircle, Activity, Gauge, TriangleAlert, RadioTower } from 'lucide-react'
import { useAuthStore } from '@netlayer/auth'
import { useQuery } from '@tanstack/react-query'
import { customersApi } from '@netlayer/api'
import { format, subMonths, startOfMonth } from 'date-fns'
import { useCustomerPortalSiteFilterStore } from '../../../noc/src/store'

const MONTHS = Array.from({ length: 6 }, (_, i) => {
  const d = subMonths(new Date(), i)
  return format(startOfMonth(d), 'yyyy-MM')
})

function UptimeBar({ percent }: { percent: number }) {
  const color =
    percent >= 99.9 ? 'var(--status-online)'
      : percent >= 99.5 ? 'var(--status-degraded)'
        : 'var(--status-offline)'
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

interface SiteBreakdown {
  siteId: string
  siteName: string
  city?: string
  status: string
  serviceCount: number
  totalBandwidthMbps: number
  openIncidents: number
  latencyMs?: number | null
  packetLossPct?: number | null
  uptimePercent: number
  downtimeMinutes: number
}

export function SlaReportsPage() {
  const { user } = useAuthStore()
  const customerId = user?.customerId ?? user?.organizationId ?? ''
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0])
  const { selectedSiteId, selectedSiteName, city, status } = useCustomerPortalSiteFilterStore()

  const { data: report, isLoading } = useQuery({
    queryKey: ['customers', customerId, 'sla', selectedMonth],
    queryFn: () => customersApi.getSlaReport(customerId, selectedMonth),
    enabled: Boolean(customerId),
    staleTime: 60_000,
  })

  const summary = (report as any)?.summary ?? {}
  const months: SlaMonth[] = (report as any)?.months ?? []
  const siteBreakdownRaw: SiteBreakdown[] = (report as any)?.siteBreakdown ?? []
  const contractedSla = Number(summary.contractedSla ?? summary.contracted_sla ?? 99.5)
  const currentUptime = Number(summary.currentUptime ?? summary.current_uptime ?? 0)
  const creditsOwed = Number(summary.creditsOwed ?? summary.credits_owed ?? 0)
  const meetsTarget = currentUptime >= contractedSla

  const filteredSites = useMemo(() => {
    return siteBreakdownRaw.filter((site) => {
      if (selectedSiteId && site.siteId !== selectedSiteId) return false
      if (city && site.city !== city) return false
      if (status && site.status !== status) return false
      return true
    })
  }, [city, selectedSiteId, siteBreakdownRaw, status])

  const reportScopeLabel = selectedSiteName ?? (city ? `${city} portfolio` : 'All customer sites')
  const scopeSummary = useMemo(() => {
    const siteCount = filteredSites.length
    const impactedSites = filteredSites.filter((site) => site.status !== 'UP').length
    const avgLatency = siteCount > 0 ? filteredSites.reduce((sum, site) => sum + Number(site.latencyMs ?? 0), 0) / siteCount : 0
    const avgPacketLoss = siteCount > 0 ? filteredSites.reduce((sum, site) => sum + Number(site.packetLossPct ?? 0), 0) / siteCount : 0
    const totalBandwidth = filteredSites.reduce((sum, site) => sum + Number(site.totalBandwidthMbps ?? 0), 0)
    const openIncidents = filteredSites.reduce((sum, site) => sum + Number(site.openIncidents ?? 0), 0)
    const totalDowntime = filteredSites.reduce((sum, site) => sum + Number(site.downtimeMinutes ?? 0), 0)

    return {
      siteCount,
      impactedSites,
      avgLatency,
      avgPacketLoss,
      totalBandwidth,
      openIncidents,
      totalDowntime,
    }
  }, [filteredSites])

  const worstSite = filteredSites
    .slice()
    .sort((left, right) => left.uptimePercent - right.uptimePercent || right.openIncidents - left.openIncidents)[0]

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Reports</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            SLA, outage, and bandwidth visibility for {reportScopeLabel}
          </p>
        </div>
        <button className="btn-ghost gap-1.5">
          <Download size={13} /> Export PDF
        </button>
      </div>

      <div
        className="rounded-2xl border px-4 py-3"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface-2)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>
              Reporting Scope
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {reportScopeLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border px-2.5 py-1" style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
              {scopeSummary.siteCount} sites
            </span>
            <span className="rounded-full border px-2.5 py-1" style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
              {scopeSummary.totalBandwidth} Mbps monitored
            </span>
            <span className="rounded-full border px-2.5 py-1" style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
              {scopeSummary.openIncidents} open incidents
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Contracted SLA',
            value: isLoading ? '--' : `${contractedSla}%`,
            icon: FileText,
            accent: 'var(--brand)',
          },
          {
            label: 'Current Uptime',
            value: isLoading ? '--' : (currentUptime ? `${currentUptime.toFixed(3)}%` : '--'),
            icon: meetsTarget ? CheckCircle : XCircle,
            accent: isLoading ? 'var(--text-muted)' : meetsTarget ? 'var(--status-online)' : 'var(--status-offline)',
          },
          {
            label: 'Impacted Sites',
            value: isLoading ? '--' : `${scopeSummary.impactedSites}`,
            icon: TriangleAlert,
            accent: scopeSummary.impactedSites > 0 ? 'var(--status-degraded)' : 'var(--status-online)',
          },
          {
            label: 'Credits Owed',
            value: isLoading ? '--' : (creditsOwed > 0 ? `₹${creditsOwed.toLocaleString('en-IN')}` : 'None'),
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

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="card p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="card-title">Monthly SLA Performance</h3>
            <div className="filter-tab-group">
              {MONTHS.map((month) => (
                <button
                  key={month}
                  onClick={() => setSelectedMonth(month)}
                  className={selectedMonth === month ? 'filter-tab-active' : 'filter-tab'}
                >
                  {format(new Date(`${month}-01`), 'MMM yyyy')}
                </button>
              ))}
            </div>
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
                  months.map((month, index) => {
                    const period = month.month ?? month.period ?? ''
                    const uptime = Number(month.uptime_percent ?? month.uptimePercent ?? 0)
                    const downtime = Number(month.total_downtime_minutes ?? month.totalDowntimeMinutes ?? 0)
                    const incidents = Number(month.incidents ?? 0)
                    const credits = Number(month.credits_issued ?? month.creditsIssued ?? 0)

                    return (
                      <tr key={period || index} className="table-row">
                        <td className="table-td">
                          <div className="flex items-center gap-2">
                            <FileText size={12} style={{ color: 'var(--text-dim)' }} className="shrink-0" />
                            <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                              {period ? format(new Date(`${period}-01`), 'MMMM yyyy') : '--'}
                            </span>
                          </div>
                        </td>
                        <td className="table-td w-52">
                          {uptime > 0 ? <UptimeBar percent={uptime} /> : <span style={{ color: 'var(--text-dim)' }} className="text-xs">--</span>}
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
                            <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>--</span>
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

        <div className="space-y-5">
          <div className="card p-4 space-y-3">
            <h3 className="card-title">Operational Snapshot</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Avg Latency', value: `${scopeSummary.avgLatency.toFixed(1)} ms`, icon: Gauge },
                { label: 'Avg Packet Loss', value: `${scopeSummary.avgPacketLoss.toFixed(2)}%`, icon: Activity },
                { label: 'Open Incidents', value: `${scopeSummary.openIncidents}`, icon: TriangleAlert },
                { label: 'Downtime (Scope)', value: `${scopeSummary.totalDowntime} min`, icon: RadioTower },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <Icon size={13} style={{ color: 'var(--brand)' }} />
                  </div>
                  <p className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <h3 className="card-title">Most Affected Site</h3>
            {worstSite ? (
              <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{worstSite.siteName}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>{worstSite.city ?? 'No city'} • {worstSite.status}</p>
                  </div>
                  <span className="badge-critical">{worstSite.openIncidents} open</span>
                </div>
                <div className="mt-4 space-y-2 text-[11px]" style={{ color: 'var(--text-dim)' }}>
                  <div className="flex items-center justify-between">
                    <span>Uptime</span>
                    <span className="font-mono">{worstSite.uptimePercent.toFixed(3)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Latency</span>
                    <span className="font-mono">{Number(worstSite.latencyMs ?? 0).toFixed(1)} ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Packet Loss</span>
                    <span className="font-mono">{Number(worstSite.packetLossPct ?? 0).toFixed(2)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Bandwidth</span>
                    <span className="font-mono">{worstSite.totalBandwidthMbps} Mbps</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border p-4 text-xs" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface-2)', color: 'var(--text-muted)' }}>
                No site-level report data available for the selected scope.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="card-header">
          <div>
            <h3 className="card-title">Site SLA Ranking</h3>
            <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Compare uptime, incidents, and performance across the current site scope.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
              <tr>
                <th className="table-th">Site</th>
                <th className="table-th">Uptime</th>
                <th className="table-th">Downtime</th>
                <th className="table-th">Open Incidents</th>
                <th className="table-th">Latency</th>
                <th className="table-th">Packet Loss</th>
              </tr>
            </thead>
            <tbody>
              {filteredSites.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    No site report rows match the selected customer scope.
                  </td>
                </tr>
              ) : (
                filteredSites
                  .slice()
                  .sort((left, right) => left.uptimePercent - right.uptimePercent || right.openIncidents - left.openIncidents)
                  .map((site) => (
                    <tr key={site.siteId} className="table-row">
                      <td className="table-td">
                        <div>
                          <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{site.siteName}</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>{site.city ?? 'No city'} • {site.status}</p>
                        </div>
                      </td>
                      <td className="table-td w-52">
                        <UptimeBar percent={site.uptimePercent} />
                      </td>
                      <td className="table-td font-mono text-xs" style={{ color: site.downtimeMinutes > 0 ? 'var(--status-offline)' : 'var(--text-muted)' }}>
                        {site.downtimeMinutes} min
                      </td>
                      <td className="table-td">
                        <span className="font-mono text-xs" style={{ color: site.openIncidents > 0 ? 'var(--status-degraded)' : 'var(--text-muted)' }}>
                          {site.openIncidents}
                        </span>
                      </td>
                      <td className="table-td font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                        {Number(site.latencyMs ?? 0).toFixed(1)} ms
                      </td>
                      <td className="table-td font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                        {Number(site.packetLossPct ?? 0).toFixed(2)}%
                      </td>
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
