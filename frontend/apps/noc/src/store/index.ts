import { create } from 'zustand'
import type { Alert, SiteStatus } from '@netlayer/api'

// ─── UI Store ─────────────────────────────────────────────────────────────────

interface UIState {
  sidebarCollapsed: boolean
  activeDrawerId: string | null
  theme: 'dark' | 'light'
  toggleSidebar: () => void
  openDrawer: (id: string) => void
  closeDrawer: () => void
  setTheme: (theme: 'dark' | 'light') => void
}

// Persist theme to localStorage
const savedTheme = (typeof window !== 'undefined' && localStorage.getItem('nl_theme') as 'dark' | 'light') || 'dark'

function applyTheme(theme: 'dark' | 'light') {
  if (typeof document !== 'undefined') {
    const root = document.documentElement
    if (theme === 'light') {
      root.classList.add('light')
    } else {
      root.classList.remove('light')
    }
  }
}

// Apply on init
applyTheme(savedTheme)

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  activeDrawerId: null,
  theme: savedTheme,

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  openDrawer: (id) => set({ activeDrawerId: id }),
  closeDrawer: () => set({ activeDrawerId: null }),
  setTheme: (theme) => {
    applyTheme(theme)
    localStorage.setItem('nl_theme', theme)
    set({ theme })
  },
}))

// ─── Alert Store (WebSocket-fed) ──────────────────────────────────────────────

interface AlertState {
  liveAlerts: Alert[]
  criticalCount: number
  warningCount: number
  pushAlert: (alert: Alert) => void
  updateAlert: (id: string, partial: Partial<Alert>) => void
  removeAlert: (id: string) => void
  setAlerts: (alerts: Alert[]) => void
}

export const useAlertStore = create<AlertState>((set) => ({
  liveAlerts: [],
  criticalCount: 0,
  warningCount: 0,

  pushAlert: (alert) =>
    set((s) => {
      const updated = [alert, ...s.liveAlerts].slice(0, 100)
      return {
        liveAlerts: updated,
        criticalCount: updated.filter((a) => a.priority === 'P1' && a.status === 'active').length,
        warningCount: updated.filter((a) => a.priority === 'P2' && a.status === 'active').length,
      }
    }),

  updateAlert: (id, partial) =>
    set((s) => {
      const updated = s.liveAlerts.map((a) => (a.id === id ? { ...a, ...partial } : a))
      return {
        liveAlerts: updated,
        criticalCount: updated.filter((a) => a.priority === 'P1' && a.status === 'active').length,
        warningCount: updated.filter((a) => a.priority === 'P2' && a.status === 'active').length,
      }
    }),

  removeAlert: (id) =>
    set((s) => {
      const updated = s.liveAlerts.filter((a) => a.id !== id)
      return {
        liveAlerts: updated,
        criticalCount: updated.filter((a) => a.priority === 'P1' && a.status === 'active').length,
        warningCount: updated.filter((a) => a.priority === 'P2' && a.status === 'active').length,
      }
    }),

  setAlerts: (alerts) =>
    set({
      liveAlerts: alerts,
      criticalCount: alerts.filter((a) => a.priority === 'P1' && a.status === 'active').length,
      warningCount: alerts.filter((a) => a.priority === 'P2' && a.status === 'active').length,
    }),
}))

// ─── Bandwidth Store (WebSocket-fed) ──────────────────────────────────────────

interface BandwidthPoint {
  timestamp: string
  inboundGbps: number
  outboundGbps: number
}

interface BandwidthState {
  history: BandwidthPoint[]
  currentInbound: number
  currentOutbound: number
  pushPoint: (point: BandwidthPoint) => void
}

export const useBandwidthStore = create<BandwidthState>((set) => ({
  history: [],
  currentInbound: 0,
  currentOutbound: 0,

  pushPoint: (point) =>
    set((s) => ({
      history: [...s.history, point].slice(-60), // keep last 60 points
      currentInbound: point.inboundGbps,
      currentOutbound: point.outboundGbps,
    })),
}))

// ─── Site Status Store (WebSocket-fed) ────────────────────────────────────────

interface SiteStatusOverride {
  siteId: string
  status: SiteStatus
  updatedAt: string
}

interface SiteStatusState {
  overrides: Record<string, SiteStatusOverride>
  applyStatusChange: (siteId: string, status: SiteStatus) => void
}

export const useSiteStatusStore = create<SiteStatusState>((set) => ({
  overrides: {},

  applyStatusChange: (siteId, status) =>
    set((s) => ({
      overrides: {
        ...s.overrides,
        [siteId]: { siteId, status, updatedAt: new Date().toISOString() },
      },
    })),
}))
