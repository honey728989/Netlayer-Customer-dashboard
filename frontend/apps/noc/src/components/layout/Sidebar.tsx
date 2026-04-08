import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  Globe,
  Map,
  Network,
  MonitorDot,
  Bell,
  Ticket,
  BarChart3,
  Users,
  Handshake,
  Settings,
  ChevronLeft,
  Wifi,
  CreditCard,
  Radar,
  BriefcaseBusiness,
  KanbanSquare,
  Wallet,
  Inbox,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { useUIStore, useAlertStore } from '@/store'
import { useAuthStore } from '@netlayer/auth'
import type { UserRole } from '@netlayer/api'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  badge?: number
  end?: boolean
}

interface NavSection {
  heading: string
  items: NavItem[]
}

const NAV_BY_ROLE: Record<UserRole, { title: string; sections: NavSection[] }> = {
  admin: {
    title: 'NOC Portal',
    sections: [
      {
        heading: 'Operations',
        items: [
          { to: '/noc', label: 'Dashboard', icon: LayoutDashboard, end: true },
          { to: '/noc/sites', label: 'Sites', icon: Globe },
          { to: '/noc/monitoring', label: 'Monitoring', icon: MonitorDot },
          { to: '/noc/bandwidth', label: 'Bandwidth', icon: Wifi },
        ],
      },
      {
        heading: 'Service',
        items: [
          { to: '/noc/alerts', label: 'Alerts', icon: Bell },
          { to: '/noc/tickets', label: 'Tickets', icon: Ticket },
          { to: '/noc/reports', label: 'Reports', icon: BarChart3 },
        ],
      },
      {
        heading: 'Management',
        items: [
          { to: '/noc/customers', label: 'Customers', icon: Users },
          { to: '/noc/partners', label: 'Partners', icon: Handshake },
          { to: '/noc/settings', label: 'Settings', icon: Settings },
        ],
      },
    ],
  },
  customer: {
    title: 'Customer Portal',
    sections: [
      {
        heading: 'Overview',
        items: [
          { to: '/portal', label: 'Dashboard', icon: LayoutDashboard, end: true },
          { to: '/portal/heatmap', label: 'Heat Map', icon: Map },
          { to: '/portal/sites', label: 'Sites', icon: Globe },
          { to: '/portal/services', label: 'Services', icon: Network },
          { to: '/portal/tickets', label: 'Tickets', icon: Ticket },
          { to: '/portal/notifications', label: 'Notifications', icon: Inbox },
          { to: '/portal/access', label: 'Access', icon: ShieldCheck },
          { to: '/portal/billing', label: 'Billing', icon: CreditCard },
          { to: '/portal/reports/sla', label: 'Reports', icon: BarChart3 },
        ],
      },
      {
        heading: 'Requests',
        items: [
          { to: '/portal/feasibility', label: 'Feasibility', icon: Radar },
        ],
      },
    ],
  },
  partner: {
    title: 'Partner Portal',
    sections: [
      {
        heading: 'Overview',
        items: [
          { to: '/partner', label: 'Dashboard', icon: LayoutDashboard, end: true },
          { to: '/partner/pipeline', label: 'Pipeline', icon: KanbanSquare },
          { to: '/partner/clients', label: 'Clients', icon: Users },
          { to: '/partner/commissions', label: 'Commissions', icon: Wallet },
        ],
      },
      {
        heading: 'Execution',
        items: [
          { to: '/partner/onboarding', label: 'Onboarding', icon: BriefcaseBusiness },
        ],
      },
    ],
  },
}

function NavItemRow({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { criticalCount } = useAlertStore()
  const badge = item.label === 'Alerts' ? criticalCount : item.badge

  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={collapsed ? item.label : undefined}
      className={({ isActive }: { isActive: boolean }) =>
        clsx(
          'group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium transition-all outline-none',
          'focus-visible:ring-2 focus-visible:ring-brand/50',
          isActive ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-surface-2 hover:text-white',
          collapsed && 'justify-center px-2',
        )
      }
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand" />
          )}
          <item.icon
            size={15}
            className={clsx('shrink-0 transition-colors', isActive && 'text-brand')}
          />
          {!collapsed && (
            <>
              <span className="flex-1 truncate">{item.label}</span>
              {badge ? <span className="badge-critical ml-auto shrink-0">{badge}</span> : null}
            </>
          )}
          {collapsed && badge ? (
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-status-offline" />
          ) : null}
        </>
      )}
    </NavLink>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { user } = useAuthStore()
  const role = user?.role ?? 'admin'
  const navConfig = NAV_BY_ROLE[role]

  return (
    <aside
      className={clsx(
        'relative flex flex-col border-r border-border bg-surface transition-all duration-200',
        sidebarCollapsed ? 'w-14' : 'w-52',
      )}
    >
      <button
        onClick={toggleSidebar}
        className={clsx(
          'absolute -right-3 top-5 z-20 flex h-6 w-6 items-center justify-center',
          'rounded-full border border-border bg-surface-2 text-muted shadow-card',
          'transition-all hover:border-border-2 hover:text-white',
          sidebarCollapsed && 'rotate-180',
        )}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronLeft size={12} />
      </button>

      <div
        className={clsx(
          'flex h-12 shrink-0 items-center border-b border-border',
          sidebarCollapsed ? 'justify-center px-2' : 'gap-2 px-4',
        )}
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-brand">
          <span className="font-mono text-[9px] font-bold text-black">NL</span>
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <p className="font-display text-sm font-bold leading-none text-white">Netlayer</p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-dim">
              {navConfig.title}
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2 pt-3" aria-label="Main navigation">
        {navConfig.sections.map((section) => (
          <div key={section.heading} className="mb-5">
            {!sidebarCollapsed && <p className="section-label">{section.heading}</p>}
            {sidebarCollapsed && <div className="mx-auto mb-2 h-px w-6 bg-border" />}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItemRow key={item.to} item={item} collapsed={sidebarCollapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
