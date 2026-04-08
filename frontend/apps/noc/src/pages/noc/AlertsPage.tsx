import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { alertsApi } from '@netlayer/api'
import { useAlertStore } from '@/store'
import { useAcknowledgeAlert } from '@/hooks/useQueries'
import { AlertPriorityBadge } from '@netlayer/ui'
import { formatDistanceToNow } from 'date-fns'
import { AlertTriangle, Search, CheckCircle2 } from 'lucide-react'
import type { Alert, AlertPriority } from '@netlayer/api'

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card px-4 py-3 flex items-center gap-3">
      <div className="h-8 w-8 rounded-lg flex items-center justify-center"
           style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
        <AlertTriangle size={14} />
      </div>
      <div>
        <p className="font-mono text-lg font-bold leading-none" style={{ color }}>{value}</p>
        <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      </div>
    </div>
  )
}

function AlertRow({ alert }: { alert: Alert }) {
  const { mutate: ack, isPending } = useAcknowledgeAlert()

  return (
    <tr className="table-row">
      <td className="table-td w-20">
        <AlertPriorityBadge priority={alert.priority} />
      </td>
      <td className="table-td">
        <p className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>{alert.message}</p>
        <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
          {alert.source?.toUpperCase()} · {alert.site_name ?? alert.siteName}
        </p>
      </td>
      <td className="table-td w-32">
        {alert.status === 'active' || alert.status === 'OPEN' ? (
          <span className="badge-critical">Active</span>
        ) : alert.status === 'acknowledged' || alert.status === 'ACKNOWLEDGED' ? (
          <span className="badge-warn">ACK</span>
        ) : (
          <span className="badge-success">Resolved</span>
        )}
      </td>
      <td className="table-td w-36 font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
        {formatDistanceToNow(new Date(alert.triggeredAt ?? alert.created_at ?? Date.now()), { addSuffix: true })}
      </td>
      <td className="table-td w-20">
        {alert.ticketId
          ? <span className="badge-info">#{alert.ticketId.slice(-5)}</span>
          : <span style={{ color: 'var(--text-dim)' }} className="text-[10px]">—</span>}
      </td>
      <td className="table-td w-12">
        {(alert.status === 'active' || alert.status === 'OPEN') && (
          <button
            onClick={() => ack(alert.id)}
            disabled={isPending}
            className="rounded p-1 transition-colors disabled:opacity-40"
            style={{ color: 'var(--text-dim)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--status-online)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
            title="Acknowledge"
          >
            <CheckCircle2 size={14} />
          </button>
        )}
      </td>
    </tr>
  )
}

export function AlertsPage() {
  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState<AlertPriority | ''>('')
  const [status, setStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['alerts', 'list', search, priority, status],
    queryFn: () => alertsApi.list({ search: search || undefined, priority: priority || undefined, pageSize: 100 }),
    refetchInterval: 15_000,
  })
  const { criticalCount, warningCount, liveAlerts } = useAlertStore()

  const allAlerts: Alert[] = [...(liveAlerts.length > 0 ? liveAlerts : []), ...(data?.data ?? [])]
  const seen = new Set<string>()
  const dedupedAlerts = allAlerts.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true })

  const filtered = dedupedAlerts.filter(a => {
    const matchSearch = !search || a.message?.toLowerCase().includes(search.toLowerCase()) || (a.siteName ?? a.site_name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchPriority = !priority || a.priority === priority
    const matchStatus = !status || (a.status ?? '').toLowerCase().includes(status.toLowerCase())
    return matchSearch && matchPriority && matchStatus
  })

  const activeCount = dedupedAlerts.filter(a => a.status === 'active' || a.status === 'OPEN').length
  const ackedCount  = dedupedAlerts.filter(a => a.status === 'acknowledged' || a.status === 'ACKNOWLEDGED').length

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Alert Dashboard</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Live feed from Zabbix · auto-refreshes every 15s</p>
        </div>
        <span className="live-dot">
          <span className="inline-block h-2 w-2 animate-pulse-slow rounded-full bg-[var(--status-online)]" />
          LIVE
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatPill label="P1 Critical" value={criticalCount}   color="var(--status-offline)"  />
        <StatPill label="P2 Warning"  value={warningCount}    color="var(--status-degraded)" />
        <StatPill label="Active"      value={activeCount}     color="var(--brand)"           />
        <StatPill label="Acknowledged" value={ackedCount}     color="var(--status-info)"     />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
          <input
            className="input-field pl-7 w-56"
            placeholder="Search alerts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-tab-group">
          {(['', 'P1', 'P2', 'P3', 'P4'] as const).map(p => (
            <button key={p} onClick={() => setPriority(p)}
              className={priority === p ? 'filter-tab-active' : 'filter-tab'}>
              {p || 'All'}
            </button>
          ))}
        </div>
        <div className="filter-tab-group">
          {[['', 'All'], ['OPEN', 'Open'], ['ACKNOWLEDGED', 'ACK'], ['RESOLVED', 'Resolved']].map(([v, l]) => (
            <button key={v} onClick={() => setStatus(v)}
              className={status === v ? 'filter-tab-active' : 'filter-tab'}>{l}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
              <tr>
                <th className="table-th">Priority</th>
                <th className="table-th">Alert / Site</th>
                <th className="table-th">Status</th>
                <th className="table-th">Triggered</th>
                <th className="table-th">Ticket</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="table-row">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="table-td">
                        <div className="skeleton h-4 rounded w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    No alerts match your filters
                  </td>
                </tr>
              ) : (
                filtered.map(a => <AlertRow key={a.id} alert={a} />)
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-2 text-[11px]" style={{ color: 'var(--text-dim)', borderTop: '1px solid var(--border)' }}>
            Showing {filtered.length} alert{filtered.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
