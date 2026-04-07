import { type ReactNode } from 'react'
import { clsx } from 'clsx'
import { TrendingUp, TrendingDown, Minus, Loader2, AlertCircle, Inbox } from 'lucide-react'
import type { SiteStatus, AlertPriority, TicketPriority } from '@netlayer/api'

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  trend?: { value: string; direction: 'up' | 'down' | 'neutral'; positive?: boolean }
  accentColor?: string
  icon?: ReactNode
  loading?: boolean
}

export function KpiCard({ label, value, sub, trend, accentColor = '#00d4ff', icon, loading }: KpiCardProps) {
  return (
    <div className="card relative overflow-hidden p-4">
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: accentColor }}
      />
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">{label}</p>
        {icon && <span className="text-muted">{icon}</span>}
      </div>
      {loading ? (
        <div className="mt-2 h-8 w-24 animate-pulse rounded bg-surface-2" />
      ) : (
        <p className="mt-1.5 font-mono text-2xl font-medium tracking-tight text-white">{value}</p>
      )}
      {sub && <p className="mt-0.5 text-[11px] text-muted">{sub}</p>}
      {trend && (
        <div
          className={clsx(
            'mt-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold',
            trend.direction === 'neutral'
              ? 'bg-surface-2 text-muted'
              : (trend.positive ?? trend.direction === 'up')
              ? 'bg-status-online/10 text-status-online'
              : 'bg-status-offline/10 text-status-offline',
          )}
        >
          {trend.direction === 'up' ? (
            <TrendingUp size={10} />
          ) : trend.direction === 'down' ? (
            <TrendingDown size={10} />
          ) : (
            <Minus size={10} />
          )}
          {trend.value}
        </div>
      )}
    </div>
  )
}

// ─── Status Pill ──────────────────────────────────────────────────────────────

interface StatusPillProps {
  status: SiteStatus
  size?: 'sm' | 'md'
}

const statusMap: Record<SiteStatus, { label: string; className: string }> = {
  online: { label: 'Online', className: 'status-online' },
  offline: { label: 'Offline', className: 'status-offline' },
  degraded: { label: 'Degraded', className: 'status-degraded' },
  maintenance: {
    label: 'Maintenance',
    className:
      'inline-flex items-center gap-1 text-brand text-[10px] font-semibold bg-brand/10 border border-brand/25 px-2 py-0.5 rounded',
  },
}

export function StatusPill({ status, size = 'sm' }: StatusPillProps) {
  const { label, className } = statusMap[status]
  return (
    <span className={clsx(className, size === 'md' && 'text-xs px-2.5 py-1')}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

const alertPriorityMap: Record<AlertPriority, string> = {
  P1: 'badge-critical',
  P2: 'badge-warn',
  P3: 'badge-info',
  P4: 'text-[10px] font-mono font-semibold bg-surface-2 text-muted border border-border px-1.5 py-0.5 rounded',
}

export function AlertPriorityBadge({ priority }: { priority: AlertPriority }) {
  return <span className={alertPriorityMap[priority]}>{priority}</span>
}

const ticketPriorityMap: Record<TicketPriority, string> = {
  critical: 'badge-critical',
  high: 'badge-warn',
  medium: 'badge-info',
  low: 'text-[10px] font-mono font-semibold bg-surface-2 text-muted border border-border px-1.5 py-0.5 rounded',
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <span className={ticketPriorityMap[priority]}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={clsx('animate-spin text-muted', className)} />
}

// ─── Page Loader ──────────────────────────────────────────────────────────────

export function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <Spinner size={24} />
    </div>
  )
}

// ─── Error State ──────────────────────────────────────────────────────────────

export function ErrorState({ message = 'Something went wrong.' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <AlertCircle size={32} className="text-status-offline/60" />
      <p className="text-sm text-muted">{message}</p>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <Inbox size={32} className="text-dim" />
      <p className="text-sm font-medium text-muted">{title}</p>
      {description && <p className="text-xs text-dim">{description}</p>}
    </div>
  )
}

// ─── Data Table ───────────────────────────────────────────────────────────────

export interface Column<T> {
  key: string
  header: string
  width?: string
  render: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  onRowClick?: (row: T) => void
  loading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  stickyHeader?: boolean
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  loading,
  emptyTitle = 'No data found',
  emptyDescription,
  stickyHeader,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-px">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-surface-2" />
        ))}
      </div>
    )
  }

  if (!data.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className={clsx(stickyHeader && 'sticky top-0 z-10 bg-surface')}>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th key={col.key} className="table-th" style={{ width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              className={clsx('table-row', onRowClick && 'cursor-pointer')}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className="table-td">
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Bandwidth Bar ────────────────────────────────────────────────────────────

export function BandwidthBar({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent))
  const color =
    clamped >= 90
      ? '#ff4d4d'
      : clamped >= 75
      ? '#ffb300'
      : '#00d4ff'
  return (
    <div className="space-y-1">
      <span className="font-mono text-[11px] text-muted">{clamped}%</span>
      <div className="h-1 w-20 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${clamped}%`, background: color }}
        />
      </div>
    </div>
  )
}

// ─── SLA Timer Badge ──────────────────────────────────────────────────────────

export function SlaTimerBadge({ deadline, breached }: { deadline: string; breached: boolean }) {
  const ms = new Date(deadline).getTime() - Date.now()
  const hours = Math.floor(ms / 3_600_000)
  const mins = Math.floor((ms % 3_600_000) / 60_000)

  if (breached || ms <= 0) {
    return <span className="badge-critical">SLA Breached</span>
  }
  if (hours < 2) {
    return <span className="badge-warn">{hours}h {mins}m left</span>
  }
  return (
    <span className="font-mono text-[11px] text-muted">
      {hours}h {mins}m
    </span>
  )
}

// ─── Search Input ─────────────────────────────────────────────────────────────

interface SearchInputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className }: SearchInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={clsx('input-field', className)}
    />
  )
}

// ─── Card Shell ───────────────────────────────────────────────────────────────

interface CardProps {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  noPadding?: boolean
}

export function Card({ title, action, children, className, bodyClassName, noPadding }: CardProps) {
  return (
    <div className={clsx('card', className)}>
      {(title || action) && (
        <div className="card-header">
          {title && <span className="card-title">{title}</span>}
          {action}
        </div>
      )}
      <div className={clsx(!noPadding && 'p-4', bodyClassName)}>{children}</div>
    </div>
  )
}
