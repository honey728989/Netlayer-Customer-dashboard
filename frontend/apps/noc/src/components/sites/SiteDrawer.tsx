import { useEffect } from 'react'
import { X, Server, Wifi, Activity, Clock } from 'lucide-react'
import { clsx } from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import { useSite, useSiteDevices, useSiteEvents } from '@/hooks/useQueries'
import { StatusPill, Spinner, BandwidthBar } from '@netlayer/ui'

interface SiteDrawerProps {
  siteId: string | null
  onClose: () => void
}

export function SiteDrawer({ siteId, onClose }: SiteDrawerProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!siteId) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Drawer */}
      <aside className="fixed right-0 top-0 z-50 flex h-full w-[520px] flex-col border-l border-border bg-surface shadow-2xl animate-slide-in-right">
        <SiteDrawerContent siteId={siteId} onClose={onClose} />
      </aside>
    </>
  )
}

function SiteDrawerContent({ siteId, onClose }: { siteId: string; onClose: () => void }) {
  const { data: site, isLoading: siteLoading } = useSite(siteId)
  const { data: devices, isLoading: devicesLoading } = useSiteDevices(siteId)
  const { data: events } = useSiteEvents(siteId, { pageSize: 20 })

  if (siteLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size={24} />
      </div>
    )
  }

  if (!site) return null

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border p-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-semibold text-white">{site.name}</h2>
            <StatusPill status={site.status} />
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {site.city}, {site.state} · {site.type} · {site.bandwidthMbps} Mbps
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-muted hover:bg-surface-2 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Latency', value: `${site.latencyMs}ms`, icon: Activity },
            { label: 'Packet Loss', value: `${site.packetLossPercent}%`, icon: Wifi },
            { label: 'SLA', value: `${site.slaPercent}%`, icon: Clock },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-md bg-surface-2 p-3 text-center">
              <Icon size={14} className="mx-auto mb-1 text-muted" />
              <p className="font-mono text-sm font-medium text-white">{value}</p>
              <p className="text-[10px] text-muted">{label}</p>
            </div>
          ))}
        </div>

        {/* Bandwidth */}
        <div>
          <p className="card-title mb-2">Bandwidth Utilization</p>
          <div className="flex items-center gap-4">
            <BandwidthBar percent={site.bandwidthUsedPercent} />
            <span className="font-mono text-xs text-muted">
              ~{Math.round((site.bandwidthMbps * site.bandwidthUsedPercent) / 100)} / {site.bandwidthMbps} Mbps
            </span>
          </div>
        </div>

        {/* Devices */}
        <div>
          <p className="card-title mb-2">Devices ({site.deviceCount})</p>
          {devicesLoading ? (
            <Spinner />
          ) : (
            <div className="space-y-1.5">
              {devices?.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Server size={13} className="text-muted" />
                    <div>
                      <p className="text-xs font-medium text-white">{device.name}</p>
                      <p className="font-mono text-[10px] text-muted">
                        {device.ip} · {device.model}
                      </p>
                    </div>
                  </div>
                  <span
                    className={clsx(
                      'text-[10px] font-semibold',
                      device.status === 'up' ? 'text-status-online' : 'text-status-offline',
                    )}
                  >
                    {device.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Event log */}
        <div>
          <p className="card-title mb-2">Recent Events</p>
          <div className="space-y-1">
            {events?.data.map((ev) => (
              <div key={ev.id} className="flex gap-3 py-1.5 border-b border-border/50 last:border-0">
                <span
                  className={clsx(
                    'mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full',
                    ev.severity === 'critical'
                      ? 'bg-status-offline'
                      : ev.severity === 'warning'
                      ? 'bg-status-degraded'
                      : 'bg-brand',
                  )}
                />
                <div className="min-w-0">
                  <p className="text-[11px] text-white">{ev.message}</p>
                  <p className="font-mono text-[10px] text-muted">
                    {ev.source} · {formatDistanceToNow(new Date(ev.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contract info */}
        <div className="rounded-md border border-border bg-surface-2 p-3 text-xs space-y-2">
          <p className="card-title">Contract</p>
          <div className="grid grid-cols-2 gap-y-1.5">
            {[
              ['Customer', site.customerName],
              ['IP (Uplink)', site.uplinkIp],
              ['Contract Expiry', new Date(site.contractExpiry).toLocaleDateString('en-IN')],
              ['Address', site.address],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-[10px] text-muted">{k}</p>
                <p className="text-white">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
