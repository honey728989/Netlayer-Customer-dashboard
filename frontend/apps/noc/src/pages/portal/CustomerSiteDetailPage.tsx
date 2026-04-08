import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { sitesApi, type SiteDevice, type SiteEvent, type SiteTraffic } from '@netlayer/api'
import { useCustomerPortalSiteFilterStore } from '@/store'
import { Card, PageHeader } from '@netlayer/ui'

function formatDate(value?: string) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-IN')
}

export function CustomerSiteDetailPage() {
  const { siteId = '' } = useParams()
  const { setSelectedSite } = useCustomerPortalSiteFilterStore()

  const { data: site, isLoading: siteLoading } = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => sitesApi.getById(siteId),
    enabled: Boolean(siteId),
    staleTime: 30_000,
  })

  const { data: traffic = [] } = useQuery({
    queryKey: ['site', siteId, 'traffic'],
    queryFn: () => {
      const to = new Date().toISOString()
      const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      return sitesApi.getTraffic(siteId, from, to)
    },
    enabled: Boolean(siteId),
    staleTime: 30_000,
  })

  const { data: devices = [] } = useQuery({
    queryKey: ['site', siteId, 'devices'],
    queryFn: () => sitesApi.getDevices(siteId),
    enabled: Boolean(siteId),
    staleTime: 60_000,
  })

  const { data: eventsResponse } = useQuery({
    queryKey: ['site', siteId, 'events'],
    queryFn: () => sitesApi.getEvents(siteId, { pageSize: 5 }),
    enabled: Boolean(siteId),
    staleTime: 30_000,
  })

  const latestTraffic = useMemo(() => {
    if (!traffic.length) return null
    return traffic[traffic.length - 1] as SiteTraffic
  }, [traffic])

  const events = (eventsResponse?.data ?? []) as SiteEvent[]

  useEffect(() => {
    if (siteId) {
      setSelectedSite(siteId, site?.name ?? null)
    }
  }, [setSelectedSite, site?.name, siteId])

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <PageHeader
        title={site?.name ?? 'Site Detail'}
        subtitle={site?.code ? `Site code: ${site.code}` : 'Operational and service detail for this site'}
      />

      <div className="flex flex-wrap gap-2">
        <Link to="/portal/sites" className="btn-ghost">Back to Sites</Link>
        <Link to="/portal/tickets/new" className="btn-primary">Raise Ticket</Link>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card title="Service Snapshot">
          {siteLoading ? (
            <div className="space-y-3">
              <div className="skeleton h-5 w-40 rounded" />
              <div className="skeleton h-20 w-full rounded" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                ['Status', site?.status ?? '—'],
                ['Bandwidth', `${site?.total_bandwidth_mbps ?? site?.bandwidth_mbps ?? site?.bandwidthMbps ?? '—'} Mbps`],
                ['Location', [site?.city, site?.state].filter(Boolean).join(', ') || '—'],
                ['POP / Last Mile', [site?.pop, site?.last_mile_provider].filter(Boolean).join(' / ') || '—'],
                ['IP Block', site?.ip_block ?? '—'],
                ['Go Live', formatDate(site?.go_live_date)],
                ['Contract End', formatDate(site?.contract_end_date ?? site?.contractExpiry)],
                ['Devices', String(site?.device_count ?? site?.deviceCount ?? '—')],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
                  <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="mt-1 font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Performance Snapshot">
          <div className="space-y-3">
            {[
              ['Inbound', `${Number(latestTraffic?.inboundMbps ?? 0).toFixed(1)} Mbps`],
              ['Outbound', `${Number(latestTraffic?.outboundMbps ?? 0).toFixed(1)} Mbps`],
              ['Latency', `${Number(latestTraffic?.latency_ms ?? site?.latencyMs ?? 0).toFixed(1)} ms`],
              ['Packet Loss', `${Number(latestTraffic?.packet_loss_pct ?? site?.packetLossPercent ?? 0).toFixed(2)}%`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span className="font-mono text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Connected Devices">
          <div className="space-y-2">
            {(devices as SiteDevice[]).length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No device metadata available for this site yet.</p>
            ) : (
              (devices as SiteDevice[]).map((device) => (
                <div key={device.id} className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{device.hostname ?? device.name ?? device.id}</p>
                    <p className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
                      {[device.type, device.vendor, device.model].filter(Boolean).join(' • ') || 'Device'}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--brand)' }}>{device.status}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Recent Site Events">
          <div className="space-y-2">
            {events.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No recent events found.</p>
            ) : (
              events.map((event) => (
                <div key={event.id} className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{event.message}</p>
                    <span className="text-[10px] font-mono uppercase" style={{ color: 'var(--brand)' }}>{event.severity}</span>
                  </div>
                  <p className="mt-1 font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
                    {formatDate(event.timestamp)} • {event.source}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
