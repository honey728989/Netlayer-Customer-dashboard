import { useState, useEffect, useRef } from 'react'
import { Bell, LogOut, ChevronDown, Sun, Moon, Settings } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuthStore } from '@netlayer/auth'
import { useAlertStore, useCustomerPortalSiteFilterStore, useUIStore } from '@/store'
import { authApi } from '@netlayer/api'

const PORTAL_META = {
  admin:    { label: 'NOC Portal',      alertsHref: '/noc/alerts' },
  customer: { label: 'Customer Portal', alertsHref: '/portal/tickets' },
  partner:  { label: 'Partner Portal',  alertsHref: '/partner' },
} as const

function LiveClock() {
  const [clock, setClock] = useState('')
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setClock(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          hour12: false, timeZone: 'Asia/Kolkata',
        }) + ' IST',
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="font-mono text-[11px] text-muted tabular-nums hidden md:inline" aria-label="Current time">
      {clock}
    </span>
  )
}

function UserInitials({ name }: { name?: string }) {
  const initials = name
    ? name.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase()
    : 'U'
  return (
    <div
      className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-all"
      style={{ backgroundColor: 'color-mix(in srgb, var(--brand) 20%, transparent)', color: 'var(--brand)' }}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}

export function TopBar() {
  const { user, clearAuth } = useAuthStore()
  const { criticalCount, warningCount } = useAlertStore()
  const { selectedSiteName } = useCustomerPortalSiteFilterStore()
  const { theme, setTheme } = useUIStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const role = (user?.role ?? 'admin') as keyof typeof PORTAL_META
  const portalMeta = PORTAL_META[role]
  const totalAlerts = criticalCount + warningCount
  const displayName = user?.name || user?.fullName || user?.email || 'User'
  const showAlertIndicator = role === 'admin' && totalAlerts > 0

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [dropdownOpen])

  const handleLogout = async () => {
    try { await authApi.logout() } finally {
      clearAuth()
      window.location.href = '/login'
    }
  }

  return (
    <header
      className="flex h-12 shrink-0 items-center gap-3 px-4"
      style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
    >
      {/* Portal title */}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--text-dim)' }}>
          {portalMeta.label}
        </p>
        <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
          {role === 'customer' && selectedSiteName
            ? `${user?.organizationName || 'Customer Network'} • ${selectedSiteName}`
            : user?.organizationName || 'Netlayer Operations'}
        </p>
      </div>

      <div className="flex-1" />

      {/* Alert indicator */}
      {showAlertIndicator && (
        <a
          href={portalMeta.alertsHref}
          className={clsx(
            'flex items-center gap-2 rounded-md border px-2.5 py-1 text-[11px] font-mono font-semibold transition-all',
            criticalCount > 0
              ? 'border-[var(--status-offline)]/30 text-[var(--status-offline)] hover:opacity-80'
              : 'border-[var(--status-degraded)]/30 text-[var(--status-degraded)] hover:opacity-80',
          )}
          style={{
            backgroundColor: criticalCount > 0
              ? 'color-mix(in srgb, var(--status-offline) 10%, transparent)'
              : 'color-mix(in srgb, var(--status-degraded) 10%, transparent)',
          }}
          aria-label={`${criticalCount} critical, ${warningCount} warning alerts`}
        >
          <Bell size={11} className="shrink-0" />
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 animate-pulse-slow rounded-full bg-current" />
            {criticalCount > 0 && <span>{criticalCount}P1</span>}
            {criticalCount > 0 && warningCount > 0 && <span className="opacity-40">·</span>}
            {warningCount > 0 && <span>{warningCount}P2</span>}
          </span>
        </a>
      )}

      <LiveClock />

      {/* Theme Toggle */}
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="flex h-7 w-7 items-center justify-center rounded-md transition-all hover:opacity-80"
        style={{ backgroundColor: 'var(--bg-surface-2)', color: 'var(--text-muted)' }}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
      </button>

      <div className="h-4 w-px" style={{ backgroundColor: 'var(--border)' }} aria-hidden="true" />

      {/* User menu */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md px-2 py-1 transition-all focus-visible:outline-none"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          aria-haspopup="menu"
          aria-expanded={dropdownOpen}
        >
          <UserInitials name={displayName} />
          <div className="hidden text-left md:block">
            <p className="text-[11px] font-medium leading-none" style={{ color: 'var(--text-primary)' }}>{displayName}</p>
            <p className="mt-0.5 text-[10px] capitalize leading-none" style={{ color: 'var(--text-muted)' }}>{user?.role}</p>
          </div>
          <ChevronDown size={12} className={clsx('transition-transform', dropdownOpen && 'rotate-180')} style={{ color: 'var(--text-dim)' }} />
        </button>

        {dropdownOpen && (
          <div
            className="absolute right-0 top-full z-50 mt-1.5 w-52 animate-scale-in rounded-xl py-1 shadow-dropdown"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--dropdown-shadow)',
            }}
            role="menu"
          >
            <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{displayName}</p>
              <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
              <span className="badge-neutral mt-1.5 capitalize inline-flex">{user?.role}</span>
            </div>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              role="menuitem"
            >
              {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
              {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            </button>
            <button
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              role="menuitem"
            >
              <Settings size={13} />
              Settings
            </button>
            <div style={{ borderTop: '1px solid var(--border)', marginTop: '2px' }} />
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors"
              style={{ color: 'var(--status-offline)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              role="menuitem"
            >
              <LogOut size={13} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
