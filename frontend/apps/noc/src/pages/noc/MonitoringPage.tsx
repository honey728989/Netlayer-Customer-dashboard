import { useAlerts, useAlertCount } from '@/hooks/useQueries'
import { AlertFeed } from '@/components/alerts/AlertFeed'
import { KpiCard, Card } from '@netlayer/ui'
import { AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react'

export function MonitoringPage() {
  const { data: alertCount, isLoading: countLoading } = useAlertCount()
  const { data: p1Alerts } = useAlerts({ priority: 'P1', status: 'active', pageSize: 20 })
  const { data: p2Alerts } = useAlerts({ priority: 'P2', status: 'active', pageSize: 20 })

  return (
    <div className="space-y-5 p-5">
      <div>
        <h1 className="font-display text-lg font-semibold text-white">Monitoring</h1>
        <p className="text-xs text-muted">Live feed — Zabbix + Internal monitors</p>
      </div>

      {/* Alert count KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Critical (P1)"
          value={alertCount?.critical ?? '—'}
          loading={countLoading}
          accentColor="#ff4d4d"
          icon={<AlertTriangle size={14} />}
        />
        <KpiCard
          label="Warning (P2)"
          value={alertCount?.warning ?? '—'}
          loading={countLoading}
          accentColor="#ffb300"
          icon={<Zap size={14} />}
        />
        <KpiCard
          label="Info (P3+)"
          value={alertCount?.info ?? '—'}
          loading={countLoading}
          accentColor="#00d4ff"
          icon={<Clock size={14} />}
        />
        <KpiCard
          label="Total Active"
          value={alertCount?.total ?? '—'}
          loading={countLoading}
          accentColor="#9c7bff"
          icon={<CheckCircle size={14} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* P1 Critical feed */}
        <Card
          title="🔴 P1 — Critical"
          action={<span className="font-mono text-[11px] text-status-offline">{p1Alerts?.total ?? 0} active</span>}
        >
          <AlertFeed alerts={p1Alerts?.data ?? []} maxItems={8} />
        </Card>

        {/* P2 Warning feed */}
        <Card
          title="🟡 P2 — Warning"
          action={<span className="font-mono text-[11px] text-status-degraded">{p2Alerts?.total ?? 0} active</span>}
        >
          <AlertFeed alerts={p2Alerts?.data ?? []} maxItems={8} />
        </Card>
      </div>

      {/* Zabbix iframe embed */}
      <Card
        title="Zabbix — Network Overview"
        action={
          <a
            href={`${import.meta.env.VITE_ZABBIX_URL ?? '#'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-brand hover:underline"
          >
            Open Zabbix →
          </a>
        }
      >
        <div className="h-96 overflow-hidden rounded-md border border-border bg-surface-2">
          {import.meta.env.VITE_ZABBIX_URL ? (
            <iframe
              src={`${import.meta.env.VITE_ZABBIX_URL}/zabbix.php?action=dashboard.view`}
              className="h-full w-full border-0"
              title="Zabbix Dashboard"
              sandbox="allow-same-origin allow-scripts allow-forms"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted">
              Set <code className="mx-1 font-mono text-brand">VITE_ZABBIX_URL</code> to embed Zabbix
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
