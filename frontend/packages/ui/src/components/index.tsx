import { type ReactNode } from 'react'
import { clsx } from 'clsx'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  AlertCircle,
  Inbox,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
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
  href?: string
}

export function KpiCard({
  label,
  value,
  sub,
  trend,
  accentColor = 'var(--brand)',
  icon,
  loading,
  href,
}: KpiCardProps) {
  const content = (
    <div className="card relative overflow-hidden p-4 transition-colors" style={{ borderTop: `2px solid ${accentColor}` }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest leading-tight" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
        {icon && (
          <span className="shrink-0 opacity-60" style={{ color: accentColor }}>
            {icon}
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-2 space-y-1.5">
          <div className="skeleton h-7 w-24" />
          <div className="skeleton h-3 w-16" />
        </div>
      ) : (
        <>
          <p className="mt-1.5 font-mono text-2xl font-medium tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>
            {value}
          </p>
          {sub && <p className="mt-1 text-[10px] leading-snug" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
        </>
      )}

      {trend && !loading && (
        <div
          className={clsx(
            'mt-2.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold',
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

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    )
  }
  return content
}

// ─── Status Pill ──────────────────────────────────────────────────────────────

interface StatusPillProps {
  status: SiteStatus | string
  size?: 'sm' | 'md'
}

function normalizeStatus(status: string): string {
  const s = status?.toUpperCase()
  if (s === 'UP' || s === 'ONLINE') return 'online'
  if (s === 'DOWN' || s === 'OFFLINE') return 'offline'
  if (s === 'DEGRADED') return 'degraded'
  if (s === 'MAINTENANCE') return 'maintenance'
  return status?.toLowerCase() ?? 'unknown'
}

const statusMap: Record<string, { label: string; color: string; pulse?: boolean }> = {
  online:      { label: 'Online',      color: 'var(--status-online)',   pulse: true },
  offline:     { label: 'Offline',     color: 'var(--status-offline)'              },
  degraded:    { label: 'Degraded',    color: 'var(--status-degraded)'             },
  maintenance: { label: 'Maintenance', color: 'var(--brand)'                       },
}

export function StatusPill({ status, size = 'sm' }: StatusPillProps) {
  const key = normalizeStatus(status)
  const cfg = statusMap[key] ?? { label: status, color: 'var(--text-muted)' }
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded font-mono font-semibold',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1',
      )}
      style={{
        color: cfg.color,
        backgroundColor: `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${cfg.color} 25%, transparent)`,
      }}
    >
      <span
        className={clsx('inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-current', cfg.pulse && 'animate-pulse-slow')}
      />
      {cfg.label}
    </span>
  )
}

// ─── Priority Badges ──────────────────────────────────────────────────────────

function priorityColor(priority: string): string {
  const p = priority?.toUpperCase()
  if (p === 'P1' || p === 'CRITICAL') return 'var(--status-offline)'
  if (p === 'P2' || p === 'HIGH')     return 'var(--status-degraded)'
  if (p === 'P3' || p === 'MEDIUM')   return 'var(--status-info)'
  return 'var(--text-muted)'
}

function priorityLabel(priority: string): string {
  const p = priority?.toUpperCase()
  if (p === 'CRITICAL') return 'Critical'
  if (p === 'HIGH')     return 'High'
  if (p === 'MEDIUM')   return 'Medium'
  if (p === 'LOW')      return 'Low'
  return priority?.toUpperCase() ?? '—'
}

export function AlertPriorityBadge({ priority }: { priority: AlertPriority | string }) {
  const color = priorityColor(priority)
  return (
    <span
      className="inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      }}
    >
      {(priority as string)?.toUpperCase()}
    </span>
  )
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority | string }) {
  const color = priorityColor(priority)
  return (
    <span
      className="inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      }}
    >
      {priorityLabel(priority)}
    </span>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <Loader2
      size={size}
      className={clsx('animate-spin', className)}
      style={{ color: 'var(--text-muted)' }}
      aria-hidden="true"
    />
  )
}

// ─── Page Loader ──────────────────────────────────────────────────────────────

export function PageLoader() {
  return (
    <div className="flex h-full min-h-48 items-center justify-center" role="status" aria-label="Loading">
      <div className="flex flex-col items-center gap-3">
        <Spinner size={20} />
        <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>Loading…</p>
      </div>
    </div>
  )
}

// ─── Error State ──────────────────────────────────────────────────────────────

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({ message = 'Something went wrong.', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full"
           style={{ backgroundColor: 'color-mix(in srgb, var(--status-offline) 10%, transparent)' }}>
        <AlertCircle size={18} style={{ color: 'var(--status-offline)', opacity: 0.7 }} />
      </div>
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{message}</p>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>Check your connection or try again.</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost mt-1">
          Retry
        </button>
      )}
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-16 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full"
           style={{ backgroundColor: 'var(--bg-surface-2)' }}>
        <Inbox size={18} style={{ color: 'var(--text-dim)' }} />
      </div>
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{title}</p>
        {description && <p className="mt-0.5 text-xs" style={{ color: 'var(--text-dim)' }}>{description}</p>}
      </div>
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
  skeletonRows?: number
}

function SkeletonRow({ cols }: { cols: number }) {
  const widths = ['w-32', 'w-24', 'w-20', 'w-28', 'w-16', 'w-20', 'w-24']
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="table-td">
          <div className={clsx('skeleton h-3', widths[i % widths.length])} />
        </td>
      ))}
    </tr>
  )
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
  skeletonRows = 6,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead
          className={clsx(stickyHeader && 'sticky top-0 z-10')}
          style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
        >
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="table-th" style={{ width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <SkeletonRow key={i} cols={columns.length} />
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState title={emptyTitle} description={emptyDescription} />
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className={clsx('table-row', onRowClick && 'cursor-pointer')}
                onClick={() => onRowClick?.(row)}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onRowClick(row)
                        }
                      }
                    : undefined
                }
                role={onRowClick ? 'button' : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className="table-td">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Bandwidth Bar ────────────────────────────────────────────────────────────

export function BandwidthBar({ percent }: { percent?: number | null }) {
  const clamped = Math.min(100, Math.max(0, percent ?? 0))
  const color =
    clamped >= 90 ? 'var(--status-offline)' : clamped >= 75 ? 'var(--status-degraded)' : 'var(--brand)'
  return (
    <div className="space-y-1">
      <span className="font-mono text-[11px]" style={{ color }}>
        {clamped}%
      </span>
      <div className="h-1.5 w-20 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-surface-3)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${clamped}%`, background: color }}
        />
      </div>
    </div>
  )
}

// ─── SLA Timer Badge ──────────────────────────────────────────────────────────

export function SlaTimerBadge({ deadline, breached }: { deadline?: string; breached?: boolean }) {
  if (!deadline) return <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>—</span>
  const ms = new Date(deadline).getTime() - Date.now()
  const hours = Math.floor(ms / 3_600_000)
  const mins = Math.floor((ms % 3_600_000) / 60_000)

  if (breached || ms <= 0) {
    return (
      <span className="inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
            style={{ color: 'var(--status-offline)', backgroundColor: 'color-mix(in srgb, var(--status-offline) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--status-offline) 25%, transparent)' }}>
        SLA Breached
      </span>
    )
  }
  if (hours < 2) {
    return (
      <span className="inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
            style={{ color: 'var(--status-degraded)', backgroundColor: 'color-mix(in srgb, var(--status-degraded) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--status-degraded) 25%, transparent)' }}>
        {hours}h {mins}m left
      </span>
    )
  }
  return (
    <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
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

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
}: SearchInputProps) {
  return (
    <div className={clsx('relative', className)}>
      <Search
        size={13}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--text-dim)' }}
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field pl-7"
        aria-label={placeholder}
      />
    </div>
  )
}

// ─── Pagination Bar ───────────────────────────────────────────────────────────

interface PaginationBarProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPrev: () => void
  onNext: () => void
}

export function PaginationBar({
  page,
  totalPages,
  total,
  pageSize,
  onPrev,
  onNext,
}: PaginationBarProps) {
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
      <span className="font-mono text-[11px]" style={{ color: 'var(--text-dim)' }}>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={page === 1}
          onClick={onPrev}
          className="btn-ghost h-7 w-7 p-0 justify-center disabled:opacity-30"
          aria-label="Previous page"
        >
          <ChevronLeft size={13} />
        </button>
        <span className="min-w-[3rem] text-center font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {page} / {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={onNext}
          className="btn-ghost h-7 w-7 p-0 justify-center disabled:opacity-30"
          aria-label="Next page"
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── Page Header ──────────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  badge?: ReactNode
}

export function PageHeader({ title, subtitle, action, badge }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-lg font-semibold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
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
  loading?: boolean
}

export function Card({
  title,
  action,
  children,
  className,
  bodyClassName,
  noPadding,
  loading,
}: CardProps) {
  return (
    <div className={clsx('card', className)}>
      {(title || action) && (
        <div className="card-header">
          {title && <span className="card-title">{title}</span>}
          {action}
        </div>
      )}
      <div className={clsx(!noPadding && 'p-4', bodyClassName, loading && 'pointer-events-none')}>
        {loading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className={clsx('skeleton h-3', i % 2 === 0 ? 'w-24' : 'w-32')} />
                <div className="skeleton h-4 w-12" />
              </div>
            ))}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
