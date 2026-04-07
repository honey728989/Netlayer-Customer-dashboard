import { useState } from 'react'
import { useAlerts } from '@/hooks/useQueries'
import { useAlertStore } from '@/store'
import { SearchInput, KpiCard, DataTable, AlertPriorityBadge, type Column } from '@netlayer/ui'
import { formatDistanceToNow } from 'date-fns'
import type { Alert, AlertPriority } from '@netlayer/api'

const PRIORITY_FILTERS: Array<{ label: string; value: AlertPriority | '' }> = [
  { label: 'All', value: '' },
  { label: 'P1 Critical', value: 'P1' },
  { label: 'P2 Warning', value: 'P2' },
  { label: 'P3 Info', value: 'P3' },
  { label: 'P4 Low', value: 'P4' },
]

const COLUMNS: Column<Alert>[] = [
  { key: 'priority', header: 'Priority', width: '80px', render: (a) => <AlertPriorityBadge priority={a.priority} /> },
  {
    key: 'message', header: 'Alert', render: (a) => (
      <div>
        <p className="font-medium text-white">{a.message}</p>
        <p className="text-[10px] text-muted font-mono">{a.type} · {a.source.toUpperCase()}</p>
      </div>
    )
  },
  { key: 'site', header: 'Site', render: (a) => <span className="text-xs">{a.siteName}</span> },
  {
    key: 'status', header: 'Status', width: '100px', render: (a) => (
      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
        a.status === 'active' ? 'bg-status-offline/10 text-status-offline' :
        a.status === 'acknowledged' ? 'bg-status-degraded/10 text-status-degraded' :
        'bg-status-online/10 text-status-online'
      }`}>{a.status}</span>
    )
  },
  {
    key: 'triggered', header: 'Triggered', width: '130px', render: (a) => (
      <span className="font-mono text-[10px] text-muted">
        {formatDistanceToNow(new Date(a.triggeredAt), { addSuffix: true })}
      </span>
    )
  },
  { key: 'ticket', header: 'Ticket', width: '100px', render: (a) => a.ticketId ? <span className="badge-info">#{a.ticketId.slice(-5)}</span> : <span className="text-muted text-[10px]">—</span> },
]

export function AlertsPage() {
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<AlertPriority | ''>('')
  const { data, isLoading } = useAlerts({ search: search || undefined, priority: priorityFilter || undefined, pageSize: 50 })
  const { criticalCount, warningCount, liveAlerts } = useAlertStore()

  return (
    <div className="space-y-5 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-semibold text-white">Alert Dashboard</h1>
          <p className="text-xs text-muted">Live feed from Zabbix + internal monitors</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Critical (P1)" value={criticalCount} accentColor="#ff4d4d" />
        <KpiCard label="Warning (P2)" value={warningCount} accentColor="#ffb300" />
        <KpiCard label="Total Active" value={liveAlerts.filter(a => a.status === 'active').length} accentColor="#00d4ff" />
        <KpiCard label="Acknowledged" value={liveAlerts.filter(a => a.status === 'acknowledged').length} accentColor="#9c7bff" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search alerts…" className="w-64" />
        <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-1">
          {PRIORITY_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setPriorityFilter(f.value)}
              className={priorityFilter === f.value
                ? 'rounded px-2.5 py-1 text-[11px] font-semibold bg-brand/15 text-brand'
                : 'rounded px-2.5 py-1 text-[11px] text-muted hover:text-white transition-colors'
              }
            >{f.label}</button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <DataTable
          columns={COLUMNS}
          data={data?.data ?? []}
          keyExtractor={(a) => a.id}
          loading={isLoading}
          emptyTitle="No alerts"
          emptyDescription="Network is healthy."
          stickyHeader
        />
      </div>
    </div>
  )
}
