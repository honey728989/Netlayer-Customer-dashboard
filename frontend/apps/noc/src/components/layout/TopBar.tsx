import { useState, useEffect, useRef } from 'react'
import { Bell, LogOut, ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuthStore } from '@netlayer/auth'
import { useAlertStore } from '@/store'
import { authApi } from '@netlayer/api'

const PORTAL_META = {
  admin: { label: 'NOC Portal', alertsHref: '/noc/alerts' },
  customer: { label: 'Customer Portal', alertsHref: '/portal/tickets' },
  partner: { label: 'Partner Portal', alertsHref: '/partner' },
} as const

function LiveClock() {
  const [clock, setClock] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setClock(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'Asia/Kolkata',
        }) + ' IST',
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <span className="font-mono text-[11px] text-dim tabular-nums" aria-label="Current time">
      {clock}
    </span>
  )
}

function UserInitials({ name }: { name?: string }) {
  const initials = name
    ? name
        .split(' ')
        .map((word) => word[0] ?? '')
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U'
  return (
    <div
      className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/20 text-[10px] font-bold text-brand"
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}

export function TopBar() {
  const { user, clearAuth } = useAuthStore()
  const { criticalCount, warningCount } = useAlertStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const role = user?.role ?? 'admin'
  const portalMeta = PORTAL_META[role]
  const totalAlerts = criticalCount + warningCount
  const displayName = user?.name || user?.fullName || user?.email || 'User'
  const showAlertIndicator = role === 'admin' && totalAlerts > 0

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [dropdownOpen])

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } finally {
      clearAuth()
      window.location.href = '/login'
    }
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-dim">
          {portalMeta.label}
        </p>
        <p className="mt-0.5 text-[11px] text-muted">
          {user?.organizationName || 'Netlayer Operations'}
        </p>
      </div>

      <div className="flex-1" />

      {showAlertIndicator && (
        <a
          href={portalMeta.alertsHref}
          className={clsx(
            'flex items-center gap-2 rounded-md border px-2.5 py-1 text-[11px] font-mono font-semibold transition-colors',
            criticalCount > 0
              ? 'border-status-offline/30 bg-status-offline/10 text-status-offline hover:bg-status-offline/15'
              : 'border-status-degraded/30 bg-status-degraded/10 text-status-degraded hover:bg-status-degraded/15',
          )}
          aria-label={`${criticalCount} critical, ${warningCount} warning alerts`}
        >
          <Bell size={11} className="shrink-0" />
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 animate-pulse-slow rounded-full bg-current" />
            {criticalCount > 0 && <span>{criticalCount} critical</span>}
            {criticalCount > 0 && warningCount > 0 && (
              <span className="text-current/40">·</span>
            )}
            {warningCount > 0 && (
              <span className={criticalCount > 0 ? 'text-status-degraded' : ''}>
                {warningCount} warning
              </span>
            )}
          </span>
        </a>
      )}

      <LiveClock />

      <div className="h-5 w-px bg-border" aria-hidden="true" />

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((value) => !value)}
          className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          aria-haspopup="menu"
          aria-expanded={dropdownOpen}
        >
          <UserInitials name={displayName} />
          <div className="hidden text-left md:block">
            <p className="text-[11px] font-medium leading-none text-white">{displayName}</p>
            <p className="mt-0.5 text-[10px] capitalize leading-none text-muted">{user?.role}</p>
          </div>
          <ChevronDown
            size={12}
            className={clsx('text-dim transition-transform', dropdownOpen && 'rotate-180')}
          />
        </button>

        {dropdownOpen && (
          <div
            className="absolute right-0 top-full z-50 mt-1.5 w-48 animate-scale-in rounded-lg border border-border bg-surface-2 py-1 shadow-dropdown"
            role="menu"
          >
            <div className="border-b border-border px-3 py-2.5">
              <p className="text-[11px] font-semibold text-white">{displayName}</p>
              <p className="mt-0.5 text-[10px] text-muted">{user?.email}</p>
              <span className="badge-neutral mt-1.5 capitalize">{user?.role}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted transition-colors hover:bg-surface-3 hover:text-status-offline focus-visible:outline-none"
              role="menuitem"
            >
              <LogOut size={12} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
