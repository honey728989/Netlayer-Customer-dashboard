import { Card, PageHeader } from '@netlayer/ui'
import { BandwidthChart } from '@/components/charts/BandwidthChart'
import { useBandwidthStore } from '@/store'

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card p-4">
      <p className="text-[10px] uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-1.5 font-mono text-xl font-semibold leading-none" style={{ color }}>
        {value}
      </p>
    </div>
  )
}

export function BandwidthPage() {
  const { currentInbound, currentOutbound, history } = useBandwidthStore()
  const peak = history.reduce((max, p) => Math.max(max, p.inboundGbps + p.outboundGbps), 0)

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <PageHeader
        title="Bandwidth"
        subtitle="Live network throughput — all sites aggregated"
      />

      {/* Current stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Inbound" value={`${currentInbound.toFixed(2)} Gbps`} color="#00d4ff" />
        <StatCard label="Total Outbound" value={`${currentOutbound.toFixed(2)} Gbps`} color="#9c7bff" />
        <StatCard label="Combined" value={`${(currentInbound + currentOutbound).toFixed(2)} Gbps`} color="#00e676" />
        <StatCard label="Session Peak" value={`${peak.toFixed(2)} Gbps`} color="#ffb300" />
      </div>

      {/* Live chart */}
      <Card
        title="Network Throughput — Live"
        action={
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-status-online">
            <span className="inline-block h-1.5 w-1.5 animate-pulse-slow rounded-full bg-status-online" />
            LIVE
          </span>
        }
        noPadding
      >
        <div className="p-4 pt-3">
          <BandwidthChart height={260} />
        </div>
      </Card>

      {/* Grafana embed */}
      <Card
        title="Per-Site Bandwidth — Grafana"
        action={
          <a
            href={import.meta.env.VITE_GRAFANA_URL ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-brand hover:underline"
          >
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
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <p className="text-xs text-muted">
                Set <code className="font-mono text-brand">VITE_GRAFANA_URL</code> to embed Grafana
              </p>
              <p className="text-[10px] text-dim">Per-site bandwidth breakdown</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
