import { useEffect } from 'react'
import { X, Server, Wifi, Activity, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useSite, useSiteDevices, useSiteEvents } from '@/hooks/useQueries'
import { StatusPill, Spinner, BandwidthBar } from '@netlayer/ui'
import type { SiteDevice } from '@netlayer/api'

interface SiteDrawerProps {
  siteId: string | null
  onClose: () => void
}

export function SiteDrawer({ siteId, onClose }: SiteDrawerProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!siteId) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-[520px] flex-col animate-slide-in-right"
             style={{ backgroundColor: 'var(--bg-surface)', borderLeft: '1px solid var(--border)', boxShadow: 'var(--elevated-shadow)' }}>
        <SiteDrawerContent siteId={siteId} onClose={onClose} />
      </aside>
    </>
  )
}

function DeviceStatus({ status }: { status: string }) {
  const up = status?.toLowerCase() === 'up' || status?.toUpperCase() === 'ONLINE' || status?.toUpperCase() === 'UP'
  return (
    <span className="text-[10px] font-semibold" style={{ color: up ? 'var(--status-online)' : 'var(--status-offline)' }}>
      {status?.toUpperCase()}
    </span>
  )
}

function SiteDrawerContent({ siteId, onClose }: { siteId: string; onClose: () => void }) {
  const { data: site, isLoading: siteLoading } = useSite(siteId)
  const { data: devices, isLoading: devicesLoading } = useSiteDevices(siteId)
  const { data: events } = useSiteEvents(siteId, { pageSize: 20 })

  if (siteLoading) {
    return <div className="flex flex-1 items-center justify-center"><Spinner size={24} /></div>
  }
  if (!site) return null

  const bwMbps = site.bandwidth_mbps ?? site.bandwidthMbps ?? 0
  const bwUsed = site.bandwidthUsedPercent ?? 0
  const latency = site.latencyMs ?? 0
  const pktLoss = site.packetLossPercent ?? 0
  const slaUptime = site.slaPercent ?? 100
  const contractExpiry = site.contractExpiry ?? site.contract_end_date

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between p-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{site.name}</h2>
            <StatusPill status={site.status} />
          </div>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            {[site.city, site.state].filter(Boolean).join(', ')}{site.type ? ` · ${site.type}` : ''}{bwMbps ? ` · ${bwMbps} Mbps` : ''}
          </p>
        </div>
        <button onClick={onClose} className="rounded p-1 transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
          <X size={16} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Latency',     value: `${latency}ms`,    icon: Activity },
            { label: 'Packet Loss', value: `${pktLoss}%`,     icon: Wifi     },
            { label: 'SLA (30d)',   value: `${slaUptime}%`,   icon: Clock    },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-md p-3 text-center" style={{ backgroundColor: 'var(--bg-surface-2)' }}>
              <Icon size={14} className="mx-auto mb-1" style={{ color: 'var(--text-muted)' }} />
              <p className="font-mono text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Bandwidth */}
        <div>
          <p className="card-title mb-2">Bandwidth Utilization</p>
          <div className="flex items-center gap-4">
            <BandwidthBar percent={bwUsed} />
            <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
              ~{Math.round((bwMbps * bwUsed) / 100)} / {bwMbps} Mbps
            </span>
          </div>
        </div>

        {/* Devices */}
        <div>
          <p className="card-title mb-2">
            Devices ({site.device_count ?? site.deviceCount ?? (devices?.length ?? 0)})
          </p>
          {devicesLoading ? (
            <Spinner />
          ) : (
            <div className="space-y-1.5">
              {(devices ?? []).map((device: SiteDevice) => (
                <div key={device.id}
                     className="flex items-center justify-between rounded-md px-3 py-2"
                     style={{ backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2">
                    <Server size={13} style={{ color: 'var(--text-muted)' }} />
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                        {device.hostname ?? device.name ?? 'Unknown'}
                      </p>
                      <p className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {device.ip_address ?? device.ip ?? ''}
                        {device.model ? ` · ${device.model}` : ''}
                      </p>
                    </div>
                  </div>
                  <DeviceStatus status={device.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Event log */}
        <div>
          <p className="card-title mb-2">Recent Events</p>
          <div className="space-y-1">
            {(events?.data ?? []).map((ev) => {
              const dotColor =
                ev.severity === 'critical' ? 'var(--status-offline)' :
                ev.severity === 'warning'  ? 'var(--status-degraded)' : 'var(--brand)'
              return (
                <div key={ev.id} className="flex gap-3 py-1.5" style={{ borderBottom: '1px solid color-mix(in srgb, var(--border) 50%, transparent)' }}>
                  <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
                  <div className="min-w-0">
                    <p className="text-[11px]" style={{ color: 'var(--text-primary)' }}>{ev.message}</p>
                    <p className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {ev.source} · {formatDistanceToNow(new Date(ev.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              )
            })}
            {!(events?.data?.length) && (
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>No recent events</p>
            )}
          </div>
        </div>

        {/* Contract info */}
        <div className="rounded-md p-3 text-xs space-y-2" style={{ backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
          <p className="card-title">Contract</p>
          <div className="grid grid-cols-2 gap-y-1.5">
            {[
              ['Customer',        site.customer_name ?? site.customerName ?? '—'],
              ['IP Block',        site.ip_block ?? '—'],
              ['Contract Expiry', contractExpiry ? new Date(contractExpiry).toLocaleDateString('en-IN') : '—'],
              ['Address',         site.address ?? '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{k}</p>
                <p style={{ color: 'var(--text-primary)' }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
