import { useState, useEffect } from 'react'
import { LogOut, Moon, Sun, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@netlayer/auth'
import { useAlertStore, useUIStore } from '@/store'
import { authApi } from '@netlayer/api'

export function TopBar() {
  const { user, clearAuth } = useAuthStore()
  const { criticalCount, warningCount } = useAlertStore()
  const { theme, setTheme } = useUIStore()
  const [clock, setClock] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)

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

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } finally {
      clearAuth()
      window.location.href = '/login'
    }
  }

  const totalAlerts = criticalCount + warningCount
  const displayName = user?.name?.trim() || user?.email || 'User'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U'

  return (
    <header className="flex h-12 shrink-0 items-center border-b border-border bg-surface px-5 gap-4">
      {/* Brand */}
      <div className="flex items-center gap-2 font-display font-bold text-sm">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-brand text-[10px] font-bold text-black font-mono">
          NL
        </div>
        <span className="text-white">Netlayer</span>
        <span className="ml-1 rounded border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
          NOC
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Alert indicator */}
        {totalAlerts > 0 && (
          <button className="flex items-center gap-1.5 rounded border border-status-offline/40 bg-status-offline/10 px-2.5 py-1 text-[11px] font-mono font-semibold text-status-offline hover:bg-status-offline/15 transition-colors">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-status-offline" />
            {criticalCount > 0 && <span>{criticalCount} Critical</span>}
            {criticalCount > 0 && warningCount > 0 && <span className="text-dim">·</span>}
            {warningCount > 0 && (
              <span className="text-status-degraded">{warningCount} Warning</span>
            )}
          </button>
        )}

        {/* Clock */}
        <span className="font-mono text-[11px] text-muted">{clock}</span>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="btn-ghost h-7 w-7 p-0 flex items-center justify-center rounded"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-surface-2 transition-colors"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/20 text-[10px] font-semibold text-brand">
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-[11px] font-medium text-white leading-none">{displayName}</p>
              <p className="text-[10px] text-muted capitalize">{user?.role}</p>
            </div>
            <ChevronDown size={12} className="text-muted" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-border bg-surface-2 py-1 shadow-xl z-50">
              <div className="border-b border-border px-3 py-2">
                <p className="text-[11px] font-medium text-white">{displayName}</p>
                <p className="text-[10px] text-muted">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted hover:bg-surface-3 hover:text-status-offline transition-colors"
              >
                <LogOut size={12} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
