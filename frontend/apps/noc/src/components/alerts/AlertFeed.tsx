import { formatDistanceToNow } from 'date-fns'
import { CheckCircle2, Activity } from 'lucide-react'
import type { Alert } from '@netlayer/api'
import { AlertPriorityBadge } from '@netlayer/ui'
import { useAcknowledgeAlert } from '@/hooks/useQueries'

const PRIORITY_COLORS: Record<string, string> = {
  P1: 'var(--status-offline)',
  P2: 'var(--status-degraded)',
  P3: 'var(--brand)',
  P4: 'var(--text-dim)',
}

function AlertItem({ alert, compact }: { alert: Alert; compact?: boolean }) {
  const { mutate: acknowledge, isPending } = useAcknowledgeAlert()
  const borderColor = PRIORITY_COLORS[alert.priority] ?? 'var(--text-dim)'

  return (
    <div
      className="transition-colors rounded-md"
      style={{
        borderLeft: `2px solid ${borderColor}`,
        backgroundColor: 'var(--bg-surface-2)',
        padding: compact ? '8px 12px' : '12px 16px',
      }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-3)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-2)')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <AlertPriorityBadge priority={alert.priority} />
            <span className="font-mono text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
              {alert.siteName}
            </span>
            {alert.status === 'acknowledged' && <span className="badge-neutral">ACK</span>}
          </div>
          <p className={`mt-1 font-medium ${compact ? 'text-xs' : 'text-sm'}`} style={{ color: 'var(--text-primary)' }}>
            {alert.message}
          </p>
          <p className="mt-0.5 font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
            {alert.source.toUpperCase()}
            {' · '}
            {formatDistanceToNow(new Date(alert.triggeredAt ?? alert.created_at ?? Date.now()), { addSuffix: true })}
            {alert.ticketId && (
              <> · <span style={{ color: 'var(--brand)' }}>#{alert.ticketId.slice(-6)}</span></>
            )}
          </p>
        </div>

        {alert.status === 'active' && (
          <button
            onClick={e => { e.stopPropagation(); acknowledge(alert.id) }}
            disabled={isPending}
            className="shrink-0 rounded p-1 transition-colors disabled:opacity-40"
            style={{ color: 'var(--text-dim)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--status-online)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
            title="Acknowledge alert"
          >
            <CheckCircle2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

interface AlertFeedProps {
  alerts: Alert[]
  compact?: boolean
  maxItems?: number
}

export function AlertFeed({ alerts, compact, maxItems }: AlertFeedProps) {
  const visible = maxItems ? alerts.slice(0, maxItems) : alerts

  if (!visible.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full"
             style={{ backgroundColor: 'color-mix(in srgb, var(--status-online) 12%, transparent)' }}>
          <Activity size={14} style={{ color: 'var(--status-online)' }} />
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No active alerts</p>
        <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>Network is healthy</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5 p-2">
      {visible.map(alert => (
        <AlertItem key={alert.id} alert={alert} compact={compact} />
      ))}
    </div>
  )
}
