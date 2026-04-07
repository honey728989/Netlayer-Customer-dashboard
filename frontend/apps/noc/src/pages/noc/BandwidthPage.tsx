import { Card } from '@netlayer/ui'
import { BandwidthChart } from '@/components/charts/BandwidthChart'
import { useBandwidthStore } from '@/store'

export function BandwidthPage() {
  const { currentInbound, currentOutbound, history } = useBandwidthStore()
  const peak = history.reduce((max, p) => Math.max(max, p.inboundGbps + p.outboundGbps), 0)

  return (
    <div className="space-y-5 p-5">
      <div>
        <h1 className="font-display text-lg font-semibold text-white">Bandwidth</h1>
        <p className="text-xs text-muted">Live network throughput — all sites aggregated</p>
      </div>

      {/* Current stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Inbound', value: `${currentInbound.toFixed(2)} Gbps`, color: '#00d4ff' },
          { label: 'Total Outbound', value: `${currentOutbound.toFixed(2)} Gbps`, color: '#9c7bff' },
          { label: 'Combined', value: `${(currentInbound + currentOutbound).toFixed(2)} Gbps`, color: '#00e676' },
          { label: 'Session Peak', value: `${peak.toFixed(2)} Gbps`, color: '#ffb300' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted">{label}</p>
            <p className="mt-1 font-mono text-xl font-medium" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Live chart */}
      <Card title="Network Throughput — Live (Gbps)" action={<span className="flex items-center gap-1.5 font-mono text-[10px] text-status-online"><span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-status-online" />LIVE</span>}>
        <BandwidthChart height={260} />
      </Card>

      {/* Grafana embed — per-site breakdown */}
      <Card
        title="Per-Site Bandwidth — Grafana"
        action={
          <a href={import.meta.env.VITE_GRAFANA_URL ?? '#'} target="_blank" rel="noopener noreferrer" className="text-[11px] text-brand hover:underline">
            Open Grafana →
          </a>
        }
      >
        <div className="h-[480px] overflow-hidden rounded-md border border-border bg-surface-2">
          {import.meta.env.VITE_GRAFANA_URL ? (
            <iframe
              src={`${import.meta.env.VITE_GRAFANA_URL}/d/bandwidth-sites?orgId=1&refresh=10s&theme=dark&kiosk`}
              className="h-full w-full border-0"
              title="Grafana Bandwidth Dashboard"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted">
              Set <code className="mx-1 font-mono text-brand">VITE_GRAFANA_URL</code> to embed Grafana
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
