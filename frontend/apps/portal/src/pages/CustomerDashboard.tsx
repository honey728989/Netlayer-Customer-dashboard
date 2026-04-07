import { Activity, Globe, Ticket as TicketIcon, FileText } from 'lucide-react'
import { useAuthStore } from '@netlayer/auth'
import { useSites, useTickets } from '@/hooks/useQueries'
import { KpiCard, Card, StatusPill, DataTable, TicketPriorityBadge, type Column } from '@netlayer/ui'
import type { Site, Ticket } from '@netlayer/api'
import { formatDistanceToNow } from 'date-fns'

const SITE_COLS: Column<Site>[] = [
  { key: 'name', header: 'Site', render: (s) => <div><p className="font-medium text-white text-xs">{s.name}</p><p className="font-mono text-[10px] text-muted">{s.city}</p></div> },
  { key: 'status', header: 'Status', width: '100px', render: (s) => <StatusPill status={s.status} /> },
  { key: 'bw', header: 'Bandwidth', width: '120px', render: (s) => <span className="font-mono text-xs text-muted">{Math.round(s.bandwidthMbps * s.bandwidthUsedPercent / 100)}/{s.bandwidthMbps} Mbps</span> },
  { key: 'latency', header: 'Latency', width: '90px', render: (s) => <span className="font-mono text-xs text-muted">{s.latencyMs}ms</span> },
]

const TICKET_COLS: Column<Ticket>[] = [
  { key: 'subject', header: 'Subject', render: (t) => <p className="font-medium text-white text-xs">{t.subject}</p> },
  { key: 'priority', header: 'Priority', width: '90px', render: (t) => <TicketPriorityBadge priority={t.priority} /> },
  { key: 'updated', header: 'Updated', width: '120px', render: (t) => <span className="font-mono text-[10px] text-muted">{formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}</span> },
]

export function CustomerDashboard() {
  const { user } = useAuthStore()
  const { data: sites, isLoading: sitesLoading } = useSites({ customerId: user?.organizationId, pageSize: 10 })
  const { data: tickets, isLoading: ticketsLoading } = useTickets({ customerId: user?.organizationId, status: 'open', pageSize: 5 })

  const onlineSites = sites?.data.filter((s) => s.status === 'online').length ?? 0
  const totalSites = sites?.data.length ?? 0
  const uptimePct = totalSites ? Math.round((onlineSites / totalSites) * 1000) / 10 : 0

  return (
    <div className="space-y-5 p-5">
      <div>
        <h1 className="font-display text-lg font-semibold text-white">
          Welcome, {user?.name.split(' ')[0]}
        </h1>
        <p className="text-xs text-muted">{user?.organizationName} · Customer Portal</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="SLA Uptime" value={`${uptimePct}%`} accentColor="#00e676" icon={<Activity size={14} />} trend={{ value: uptimePct >= 99.5 ? 'Meeting SLA' : 'Below SLA', direction: uptimePct >= 99.5 ? 'up' : 'down' }} />
        <KpiCard label="Total Sites" value={totalSites} loading={sitesLoading} icon={<Globe size={14} />} accentColor="#00d4ff" />
        <KpiCard label="Open Tickets" value={tickets?.total ?? 0} loading={ticketsLoading} icon={<TicketIcon size={14} />} accentColor="#9c7bff" />
        <KpiCard label="Avg Latency" value={`${sites?.data.reduce((sum, s) => sum + s.latencyMs, 0) ? Math.round((sites?.data.reduce((sum, s) => sum + s.latencyMs, 0) ?? 0) / totalSites) : 0}ms`} accentColor="#ffb300" loading={sitesLoading} />
      </div>

      {/* Grafana embed */}
      <Card title="Bandwidth Usage — 30 Days" action={<a href="/portal/reports/usage" className="text-[11px] text-brand hover:underline">Full report →</a>}>
        <div className="flex h-48 items-center justify-center rounded-md bg-surface-2 text-xs text-muted border border-dashed border-border">
          {/* In production: <iframe src="/grafana/d/bandwidth?orgId=..." className="h-full w-full rounded" /> */}
          Grafana dashboard embedded here · orgId={user?.organizationId}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Sites */}
        <Card title="My Sites" action={<a href="/portal/sites" className="text-[11px] text-brand hover:underline">All sites →</a>} noPadding>
          <DataTable columns={SITE_COLS} data={sites?.data ?? []} keyExtractor={(s) => s.id} loading={sitesLoading} emptyTitle="No sites found" />
        </Card>

        {/* Tickets */}
        <Card title="Open Tickets" action={<a href="/portal/tickets" className="text-[11px] text-brand hover:underline">All tickets →</a>} noPadding>
          <DataTable columns={TICKET_COLS} data={tickets?.data ?? []} keyExtractor={(t) => t.id} loading={ticketsLoading} emptyTitle="No open tickets" emptyDescription="All caught up!" />
        </Card>
      </div>
    </div>
  )
}
