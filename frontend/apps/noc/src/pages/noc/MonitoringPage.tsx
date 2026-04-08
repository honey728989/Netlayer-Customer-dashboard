import { useAlerts, useAlertCount } from '@/hooks/useQueries'
import { AlertFeed } from '@/components/alerts/AlertFeed'
import { appEnv } from '@/config/env'
import { KpiCard, Card, PageHeader } from '@netlayer/ui'
import { AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react'

export function MonitoringPage() {
  const { data: alertCount, isLoading: countLoading } = useAlertCount()
  const { data: p1Alerts } = useAlerts({ priority: 'P1', status: 'active', pageSize: 20 })
  const { data: p2Alerts } = useAlerts({ priority: 'P2', status: 'active', pageSize: 20 })

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <PageHeader
        title="Monitoring"
        subtitle="Live feed — Zabbix + Internal monitors"
      />

      {/* Alert count KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          title="P1 — Critical"
          action={
            <span className="font-mono text-[11px] text-status-offline">
              {p1Alerts?.total ?? 0} active
            </span>
          }
        >
          <AlertFeed alerts={p1Alerts?.data ?? []} maxItems={8} />
        </Card>

        {/* P2 Warning feed */}
        <Card
          title="P2 — Warning"
          action={
            <span className="font-mono text-[11px] text-status-degraded">
              {p2Alerts?.total ?? 0} active
            </span>
          }
        >
          <AlertFeed alerts={p2Alerts?.data ?? []} maxItems={8} />
        </Card>
      </div>

      {/* Zabbix iframe embed */}
      <Card
        title="Zabbix — Network Overview"
        action={
          <a
            href={`${appEnv.zabbixUrl ?? '#'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-brand hover:underline"
          >
            Open Zabbix →
          </a>
        }
      >
        <div className="h-96 overflow-hidden rounded-md border border-border bg-surface-2">
          {appEnv.zabbixUrl ? (
            <iframe
              src={`${appEnv.zabbixUrl}/zabbix.php?action=dashboard.view`}
              className="h-full w-full border-0"
              title="Zabbix Dashboard"
              sandbox="allow-same-origin allow-scripts allow-forms"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <p className="text-xs text-muted">Set <code className="font-mono text-brand">VITE_ZABBIX_URL</code> to embed Zabbix</p>
              <p className="text-[10px] text-dim">e.g., VITE_ZABBIX_URL=https://zabbix.internal</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
