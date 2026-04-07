import { Globe, Wifi, WifiOff, Ticket, Radio } from 'lucide-react'
import { KpiCard, Card, ErrorState } from '@netlayer/ui'
import { BandwidthChart } from '@/components/charts/BandwidthChart'
import { AlertFeed } from '@/components/alerts/AlertFeed'
import { useSiteStats, useAlerts, useTicketSlaStats } from '@/hooks/useQueries'
import { useAlertStore, useBandwidthStore } from '@/store'

function LiveDot() {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[10px] text-status-online">
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-status-online" />
      LIVE
    </span>
  )
}

export function DashboardPage() {
  const { data: siteStats, isLoading: statsLoading, isError: statsError } = useSiteStats()
  const { data: alertsData, isLoading: alertsLoading } = useAlerts({ pageSize: 15, status: 'active' })
  const { data: slaStats, isLoading: slaLoading } = useTicketSlaStats()
  const { liveAlerts } = useAlertStore()
  const { currentInbound, currentOutbound } = useBandwidthStore()

  if (statsError) return <ErrorState message="Failed to load dashboard data." />

  const feedAlerts = liveAlerts.length > 0 ? liveAlerts : alertsData?.data ?? []

  return (
    <div className="space-y-5 p-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-semibold text-white">NOC Overview</h1>
          <p className="text-xs text-muted">Network Operations Center · India Region</p>
        </div>
        <LiveDot />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Total Sites"
          value={statsLoading ? '…' : siteStats?.total ?? 0}
          sub="ILL + Business BB"
          icon={<Globe size={14} />}
          accentColor="#00d4ff"
          loading={statsLoading}
          trend={{ value: '+12 this month', direction: 'up' }}
        />
        <KpiCard
          label="Online"
          value={statsLoading ? '…' : siteStats?.online ?? 0}
          sub={`${siteStats ? Math.round((siteStats.online / siteStats.total) * 100) : 0}% availability`}
          icon={<Wifi size={14} />}
          accentColor="#00e676"
          loading={statsLoading}
          trend={{ value: '↑ 0.3%', direction: 'up' }}
        />
        <KpiCard
          label="Offline / Down"
          value={statsLoading ? '…' : siteStats?.offline ?? 0}
          sub={`${siteStats?.degraded ?? 0} degraded`}
          icon={<WifiOff size={14} />}
          accentColor="#ff4d4d"
          loading={statsLoading}
          trend={{ value: '↑ 4 from yesterday', direction: 'down', positive: false }}
        />
        <KpiCard
          label="Open Tickets"
          value={slaLoading ? '…' : slaStats?.open ?? 0}
          sub={`${slaStats?.atRisk ?? 0} SLA at risk`}
          icon={<Ticket size={14} />}
          accentColor="#9c7bff"
          loading={slaLoading}
          trend={{ value: `${slaStats?.breached ?? 0} breached`, direction: slaStats?.breached ? 'down' : 'neutral', positive: !slaStats?.breached }}
        />
        <KpiCard
          label="Live Bandwidth"
          value={`${(currentInbound + currentOutbound).toFixed(1)}G`}
          sub={`↓ ${currentInbound.toFixed(1)}  ↑ ${currentOutbound.toFixed(1)} Gbps`}
          icon={<Radio size={14} />}
          accentColor="#ffb300"
          trend={{ value: 'Live', direction: 'neutral' }}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Bandwidth chart — 2 cols */}
        <div className="xl:col-span-2">
          <Card
            title="Network Throughput — Live"
            action={
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-[11px] text-muted">
                  <span className="inline-block h-2 w-2 rounded-sm bg-brand" />
                  Inbound
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-muted">
                  <span className="inline-block h-2 w-2 rounded-sm bg-status-info" />
                  Outbound
                </span>
                <LiveDot />
              </div>
            }
          >
            <BandwidthChart height={180} />
          </Card>
        </div>

        {/* Network health gauges */}
        <Card title="Network Health">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Avg Latency', value: '2.1ms', color: '#00e676' },
              { label: 'Packet Loss', value: '0.02%', color: '#00e676' },
              { label: 'Uptime (30d)', value: '99.5%', color: '#ffb300' },
              { label: 'BW Utilization', value: `${siteStats ? Math.round(((currentInbound + currentOutbound) / 53.2) * 100) : 72}%`, color: '#00d4ff' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-md bg-surface-2 p-3 text-center">
                <p className="font-mono text-xl font-medium" style={{ color }}>
                  {value}
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted">{label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        {/* Alert feed — 3 cols */}
        <div className="xl:col-span-3">
          <Card
            title="Active Alerts"
            action={
              <a href="/noc/alerts" className="text-[11px] text-brand hover:underline">
                View all →
              </a>
            }
            noPadding
          >
            <div className="p-4">
              {alertsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded bg-surface-2" />
                  ))}
                </div>
              ) : (
                <AlertFeed alerts={feedAlerts} compact maxItems={6} />
              )}
            </div>
          </Card>
        </div>

        {/* Ticket SLA summary — 2 cols */}
        <div className="xl:col-span-2">
          <Card title="Ticket SLA Summary">
            <div className="space-y-3">
              {(slaLoading
                ? Array.from({ length: 5 }, (_, index) => ({
                    label: `loading-${index}`,
                    value: '...',
                    color: '#6b7280',
                  }))
                : [
                { label: 'Open', value: slaStats?.open ?? 0, color: '#00d4ff' },
                { label: 'In Progress', value: slaStats?.inProgress ?? 0, color: '#9c7bff' },
                { label: 'At Risk', value: slaStats?.atRisk ?? 0, color: '#ffb300' },
                { label: 'Breached', value: slaStats?.breached ?? 0, color: '#ff4d4d' },
                { label: 'Resolved Today', value: slaStats?.resolvedToday ?? 0, color: '#00e676' },
              ]).map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-muted">{label}</span>
                  <span className="font-mono text-sm font-medium" style={{ color }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
