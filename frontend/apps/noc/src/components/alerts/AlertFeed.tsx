import { clsx } from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import { CheckCircle2, Circle } from 'lucide-react'
import type { Alert } from '@netlayer/api'
import { AlertPriorityBadge } from '@netlayer/ui'
import { useAcknowledgeAlert } from '@/hooks/useQueries'

const priorityBorder: Record<string, string> = {
  P1: 'border-l-status-offline',
  P2: 'border-l-status-degraded',
  P3: 'border-l-brand',
  P4: 'border-l-dim',
}

interface AlertItemProps {
  alert: Alert
  compact?: boolean
}

export function AlertItem({ alert, compact }: AlertItemProps) {
  const { mutate: acknowledge, isPending } = useAcknowledgeAlert()

  return (
    <div
      className={clsx(
        'border-l-2 bg-surface-2 transition-colors hover:bg-surface-3',
        priorityBorder[alert.priority] ?? 'border-l-dim',
        compact ? 'rounded px-3 py-2' : 'rounded-md px-4 py-3',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <AlertPriorityBadge priority={alert.priority} />
            <span className="text-[11px] font-mono text-muted">{alert.siteName}</span>
            {alert.status === 'acknowledged' && (
              <span className="text-[10px] text-muted border border-border rounded px-1">ACK</span>
            )}
          </div>
          <p className={clsx('mt-1 font-medium text-white', compact ? 'text-xs' : 'text-sm')}>
            {alert.message}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-muted">
            {alert.source.toUpperCase()} ·{' '}
            {formatDistanceToNow(new Date(alert.triggeredAt), { addSuffix: true })}
            {alert.ticketId && ` · Ticket #${alert.ticketId}`}
          </p>
        </div>

        {alert.status === 'active' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              acknowledge(alert.id)
            }}
            disabled={isPending}
            className="shrink-0 rounded p-1 text-muted hover:text-status-online transition-colors disabled:opacity-50"
            title="Acknowledge"
          >
            <CheckCircle2 size={14} />
          </button>
        )}
        {alert.status === 'acknowledged' && (
          <Circle size={14} className="shrink-0 text-dim" />
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
      <p className="py-6 text-center text-xs text-muted">No active alerts</p>
    )
  }

  return (
    <div className="space-y-2">
      {visible.map((alert) => (
        <AlertItem key={alert.id} alert={alert} compact={compact} />
      ))}
    </div>
  )
}
