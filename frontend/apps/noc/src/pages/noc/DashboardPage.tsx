import { Globe, AlertTriangle, Ticket, Activity, RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { sitesApi, alertsApi, ticketsApi } from '@netlayer/api'
import { BandwidthChart } from '@/components/charts/BandwidthChart'
import { AlertFeed } from '@/components/alerts/AlertFeed'
import { useAlertStore, useBandwidthStore } from '@/store'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

function StatCard({ label, value, sub, icon: Icon, accent, trend, loading }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent: string;
  trend?: { value: string; up: boolean }; loading?: boolean
}) {
  return (
    <div className="metric-card animate-fade-in" style={{ borderTop: `2px solid ${accent}` }}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>
          <Icon size={14} />
        </span>
      </div>
      {loading ? (
        <div className="space-y-1.5">
          <div className="skeleton h-7 w-24 rounded" />
          <div className="skeleton h-3 w-16 rounded" />
        </div>
      ) : (
        <>
          <p className="font-mono text-2xl font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>{value}</p>
          {sub && <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
          {trend && (
            <div className="mt-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                 style={{
                   color: trend.up ? 'var(--status-online)' : 'var(--status-offline)',
                   backgroundColor: trend.up
                     ? 'color-mix(in srgb, var(--status-online) 10%, transparent)'
                     : 'color-mix(in srgb, var(--status-offline) 10%, transparent)',
                 }}>
              {trend.up ? '▲' : '▼'} {trend.value}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function HealthCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg p-3 text-center"
         style={{ backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
      <p className="font-mono text-xl font-bold" style={{ color }}>{value}</p>
      <p className="mt-1 text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  )
}

export function DashboardPage() {
  const { data: siteStats, isLoading: statsLoading, refetch } = useQuery({
    queryKey: ['sites', 'stats'],
    queryFn: () => sitesApi.getStats(),
    refetchInterval: 30_000,
  })
  const { data: alertCount, isLoading: alertLoading } = useQuery({
    queryKey: ['alerts', 'count'],
    queryFn: () => alertsApi.getActiveCount(),
    refetchInterval: 10_000,
  })
  const { data: slaStats, isLoading: slaLoading } = useQuery({
    queryKey: ['tickets', 'sla-stats'],
    queryFn: () => ticketsApi.getSlaStats(),
    refetchInterval: 60_000,
  })
  const { data: alertsData } = useQuery({
    queryKey: ['alerts', 'list', 'feed'],
    queryFn: () => alertsApi.list({ pageSize: 10 }),
    refetchInterval: 15_000,
  })

  const { liveAlerts } = useAlertStore()
  const { currentInbound, currentOutbound, history } = useBandwidthStore()

  const feedAlerts = liveAlerts.length > 0 ? liveAlerts : (alertsData?.data ?? [])
  const availPercent = siteStats
    ? Math.round((siteStats.online / Math.max(siteStats.total, 1)) * 1000) / 10
    : 0

  const bwData = history.length > 0
    ? history.slice(-20).map((p, i) => ({ name: String(i), inbound: +p.inboundGbps.toFixed(3), outbound: +p.outboundGbps.toFixed(3) }))
    : Array.from({ length: 20 }, (_, i) => ({ name: String(i), inbound: +(Math.random() * 2 + 0.5).toFixed(3), outbound: +(Math.random() * 1 + 0.3).toFixed(3) }))

  const incidentData = [
    { name: 'P1 Critical', value: alertCount?.critical ?? 0, color: 'var(--status-offline)' },
    { name: 'P2 Warning', value: alertCount?.warning ?? 0, color: 'var(--status-degraded)' },
    { name: 'P3/P4 Info', value: Math.max((alertCount?.total ?? 0) - (alertCount?.critical ?? 0) - (alertCount?.warning ?? 0), 0), color: 'var(--brand)' },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-5 p-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>NOC Overview</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Network Operations Center · India Region</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="live-dot">
            <span className="inline-block h-2 w-2 animate-pulse-slow rounded-full bg-[var(--status-online)]" />
            LIVE
          </span>
          <button onClick={() => refetch()} className="btn-ghost gap-1.5">
            <RefreshCw size={12} /> <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Sites" value={siteStats?.total ?? 0}
          sub={`${siteStats?.online ?? 0} online · ${siteStats?.offline ?? 0} down`}
          icon={Globe} accent="var(--brand)" loading={statsLoading} />
        <StatCard label="Network Availability" value={`${availPercent}%`}
          sub={siteStats?.degraded ? `${siteStats.degraded} degraded` : 'All healthy'}
          icon={Activity} accent="var(--status-online)" loading={statsLoading}
          trend={availPercent >= 99 ? { value: 'SLA met', up: true } : { value: 'Below target', up: false }} />
        <StatCard label="Active Alerts" value={alertCount?.total ?? 0}
          sub={alertCount?.critical ? `${alertCount.critical} P1 critical` : 'No P1 alerts'}
          icon={AlertTriangle} accent={alertCount?.critical ? 'var(--status-offline)' : 'var(--status-degraded)'}
          loading={alertLoading} />
        <StatCard label="Open Tickets" value={(slaStats?.open ?? 0) + (slaStats?.inProgress ?? 0)}
          sub={slaStats?.breached ? `${slaStats.breached} SLA breached` : 'All within SLA'}
          icon={Ticket} accent="var(--status-info)" loading={slaLoading}
          trend={slaStats?.breached ? { value: `${slaStats.breached} breached`, up: false } : undefined} />
      </div>

      {/* Three column grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* Network state + incident pie */}
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="card-title">Network State</h3>
            <span className="badge-neutral">Live</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <HealthCell label="Online"      value={siteStats?.online      ?? 0} color="var(--status-online)"   />
            <HealthCell label="Offline"     value={siteStats?.offline     ?? 0} color="var(--status-offline)"  />
            <HealthCell label="Degraded"    value={siteStats?.degraded    ?? 0} color="var(--status-degraded)" />
            <HealthCell label="Maintenance" value={siteStats?.maintenance ?? 0} color="var(--status-info)"     />
          </div>

          {incidentData.length > 0 && (
            <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
              <p className="card-title mb-3">Incident Distribution</p>
              <div className="flex items-center gap-4">
                <PieChart width={80} height={80}>
                  <Pie data={incidentData} cx={36} cy={36} innerRadius={22} outerRadius={36} dataKey="value" strokeWidth={0}>
                    {incidentData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
                <div className="space-y-1.5 flex-1">
                  {incidentData.map(d => (
                    <div key={d.name} className="flex items-center gap-2 text-[11px]">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span style={{ color: 'var(--text-muted)' }}>{d.name}</span>
                      <span className="font-mono font-semibold ml-auto" style={{ color: 'var(--text-primary)' }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bandwidth sparkline */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="card-title">Aggregate Bandwidth</h3>
            <span className="font-mono text-xs font-semibold" style={{ color: 'var(--brand)' }}>
              {((currentInbound + currentOutbound) / 1e9).toFixed(2)} Gbps
            </span>
          </div>
          <div className="flex gap-4 mb-3">
            {[
              { label: 'Inbound',  val: currentInbound,  color: 'var(--brand)' },
              { label: 'Outbound', val: currentOutbound, color: 'var(--status-info)' },
            ].map(({ label, val, color }) => (
              <div key={label}>
                <p className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>{label}</p>
                <p className="font-mono text-sm font-semibold" style={{ color }}>{(val / 1e9).toFixed(2)} Gbps</p>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={bwData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <defs>
                <linearGradient id="inGrad"  x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--brand)"       stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--brand)"       stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--status-info)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--status-info)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis hide />
              <YAxis tick={{ fontSize: 9, fill: 'var(--text-dim)' }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: 'var(--text-muted)' }}
              />
              <Area type="monotone" dataKey="inbound"  stroke="var(--brand)"       strokeWidth={1.5} fill="url(#inGrad)"  name="Inbound Gbps"  />
              <Area type="monotone" dataKey="outbound" stroke="var(--status-info)" strokeWidth={1.5} fill="url(#outGrad)" name="Outbound Gbps" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* SLA / Ticket Health */}
        <div className="card p-4 space-y-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="card-title">SLA / Ticket Health</h3>
            <a href="/noc/tickets" className="text-[11px] hover:underline" style={{ color: 'var(--brand)' }}>View all →</a>
          </div>
          {[
            { label: 'Open',           value: slaStats?.open ?? 0,          color: 'var(--brand)' },
            { label: 'In Progress',    value: slaStats?.inProgress ?? 0,    color: 'var(--status-info)' },
            { label: 'At Risk',        value: slaStats?.atRisk ?? 0,        color: 'var(--status-degraded)' },
            { label: 'SLA Breached',   value: slaStats?.breached ?? 0,      color: 'var(--status-offline)' },
            { label: 'Resolved Today', value: slaStats?.resolvedToday ?? 0, color: 'var(--status-online)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between py-2.5"
                 style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span className="font-mono text-sm font-semibold" style={{ color }}>{slaLoading ? '—' : value}</span>
            </div>
          ))}
          <div className="pt-3 flex gap-2">
            <a href="/noc/tickets" className="btn-ghost text-[11px] flex-1 justify-center">Tickets</a>
            <a href="/noc/alerts"  className="btn-ghost text-[11px] flex-1 justify-center">Alerts</a>
          </div>
        </div>
      </div>

      {/* Alert Feed + 24h Bandwidth */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Live Alert Feed</h3>
            <div className="flex items-center gap-2">
              <span className="live-dot">
                <span className="inline-block h-1.5 w-1.5 animate-pulse-slow rounded-full bg-[var(--status-online)]" />
                Live
              </span>
              <a href="/noc/alerts" className="btn-ghost text-[11px] py-1">All alerts →</a>
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            <AlertFeed alerts={feedAlerts.slice(0, 8)} compact />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Bandwidth — Last 24h</h3>
            <a href="/noc/bandwidth" className="btn-ghost text-[11px] py-1">Full view →</a>
          </div>
          <div className="p-4">
            <BandwidthChart height={220} />
          </div>
        </div>
      </div>

    </div>
  )
}
