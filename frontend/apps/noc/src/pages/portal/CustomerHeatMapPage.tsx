import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@netlayer/auth'
import { customersApi, type CustomerHeatmapPoint, type Site } from '@netlayer/api'
import { CustomerSiteFilterBar } from '@/components/portal/CustomerSiteFilterBar'
import { applyHeatmapFilters } from '@/lib/customerSiteFilters'
import { useCustomerPortalSiteFilterStore } from '@/store'
import { Card, EmptyState, ErrorState, KpiCard, PageHeader, StatusPill } from '@netlayer/ui'

function getHealthScore(point: CustomerHeatmapPoint) {
  const latencyPenalty = Math.min(35, Math.round((point.latestLatencyMs ?? 0) / 4))
  const packetLossPenalty = Math.min(35, Math.round((point.latestPacketLossPct ?? 0) * 12))
  const alertPenalty = Math.min(20, point.activeAlertCount * 5)
  const statusPenalty =
    point.status === 'DOWN' || point.status === 'offline'
      ? 40
      : point.status === 'DEGRADED' || point.status === 'degraded'
        ? 20
        : 0

  return Math.max(0, 100 - latencyPenalty - packetLossPenalty - alertPenalty - statusPenalty)
}

function getHeatTone(score: number) {
  if (score >= 85) return 'var(--status-online)'
  if (score >= 65) return 'var(--status-info)'
  if (score >= 45) return 'var(--status-degraded)'
  return 'var(--status-offline)'
}

export function CustomerHeatMapPage() {
  const { user } = useAuthStore()
  const customerId = user?.customerId ?? user?.organizationId ?? ''
  const { selectedSiteId, city, status, setSelectedSite } = useCustomerPortalSiteFilterStore()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['customers', customerId, 'heatmap'],
    queryFn: () => customersApi.getHeatmap(customerId),
    enabled: Boolean(customerId),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const points = applyHeatmapFilters(data ?? [], { selectedSiteId, city, status })
  const filterSites = (data ?? []).map((point) => ({
    id: point.siteId,
    name: point.siteName,
    city: point.city ?? undefined,
    state: point.state ?? undefined,
    status: point.status,
    type: undefined,
  })) as Site[]

  const summary = useMemo(() => {
    const online = points.filter((point) => ['UP', 'ONLINE', 'online'].includes(point.status)).length
    const degraded = points.filter((point) => ['DEGRADED', 'degraded'].includes(point.status)).length
    const offline = points.filter((point) => ['DOWN', 'OFFLINE', 'offline'].includes(point.status)).length
    const avgLatency =
      points.length > 0
        ? Math.round(points.reduce((sum, point) => sum + (point.latestLatencyMs ?? 0), 0) / points.length)
        : 0

    return { online, degraded, offline, avgLatency }
  }, [points])

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <PageHeader
        title="Network Heat Map"
        subtitle="Site-wise operational intensity based on alerts, latency, packet loss, and service load"
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="Sites Tracked" value={points.length} loading={isLoading} accentColor="var(--brand)" />
        <KpiCard label="Healthy" value={summary.online} loading={isLoading} accentColor="var(--status-online)" />
        <KpiCard label="At Risk" value={summary.degraded + summary.offline} loading={isLoading} accentColor="var(--status-degraded)" />
        <KpiCard label="Avg Latency" value={`${summary.avgLatency} ms`} loading={isLoading} accentColor="var(--status-info)" />
      </div>

      {isError ? (
        <ErrorState message="Failed to load heat map data." onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-5">
          <CustomerSiteFilterBar sites={filterSites} />
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
          <Card
            title="Operational Heat Grid"
            action={<span className="text-[11px] text-muted">Live customer footprint</span>}
          >
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="skeleton h-28 rounded-lg" />
                ))}
              </div>
            ) : points.length === 0 ? (
              <EmptyState
                title="No heat map data yet"
                description="Once customer sites and site metrics start flowing, this map will highlight the hottest operational regions."
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {points.map((point) => {
                  const score = getHealthScore(point)
                  const tone = getHeatTone(score)

                  return (
                    <Link
                      key={point.siteId}
                      to={`/portal/sites/${point.siteId}`}
                      onClick={() => setSelectedSite(point.siteId, point.siteName)}
                      className="rounded-lg p-3 transition-transform hover:-translate-y-0.5"
                      style={{
                        display: 'block',
                        backgroundColor: `color-mix(in srgb, ${tone} 12%, var(--bg-surface))`,
                        border: `1px solid color-mix(in srgb, ${tone} 22%, var(--border))`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-white">{point.siteName}</p>
                          <p className="mt-0.5 text-[10px] text-dim">
                            {[point.city, point.state].filter(Boolean).join(', ') || 'Unknown region'}
                          </p>
                        </div>
                        <span className="font-mono text-sm font-semibold" style={{ color: tone }}>
                          {score}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[10px] text-muted">
                        <span>{point.totalBandwidthMbps} Mbps</span>
                        <StatusPill status={point.status} />
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                        <div className="rounded-md bg-surface-2 px-2 py-1">
                          <p className="text-dim">Alerts</p>
                          <p className="mt-0.5 font-mono text-white">{point.activeAlertCount}</p>
                        </div>
                        <div className="rounded-md bg-surface-2 px-2 py-1">
                          <p className="text-dim">Latency</p>
                          <p className="mt-0.5 font-mono text-white">{Math.round(point.latestLatencyMs ?? 0)} ms</p>
                        </div>
                        <div className="rounded-md bg-surface-2 px-2 py-1">
                          <p className="text-dim">Packet Loss</p>
                          <p className="mt-0.5 font-mono text-white">{(point.latestPacketLossPct ?? 0).toFixed(2)}%</p>
                        </div>
                        <div className="rounded-md bg-surface-2 px-2 py-1">
                          <p className="text-dim">Services</p>
                          <p className="mt-0.5 font-mono text-white">{point.serviceCount}</p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </Card>

          <Card title="Hotspot Ranking">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="skeleton h-12 rounded-md" />
                ))}
              </div>
            ) : points.length === 0 ? (
              <EmptyState title="No hotspots yet" description="Risk hotspots will show up here as soon as site telemetry is available." />
            ) : (
              <div className="space-y-2.5">
                {[...points]
                  .sort((left, right) => getHealthScore(left) - getHealthScore(right))
                  .slice(0, 8)
                  .map((point, index) => {
                    const score = getHealthScore(point)
                    const tone = getHeatTone(score)
                    return (
                      <div key={point.siteId} className="rounded-md border border-border bg-surface-2 px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white">
                              {index + 1}. {point.siteName}
                            </p>
                            <p className="mt-0.5 text-[10px] text-dim">
                              {[point.city, point.state].filter(Boolean).join(', ') || 'Unknown region'}
                            </p>
                          </div>
                          <span className="font-mono text-sm font-semibold" style={{ color: tone }}>
                            {score}
                          </span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </Card>
          </div>
        </div>
      )}
    </div>
  )
}
