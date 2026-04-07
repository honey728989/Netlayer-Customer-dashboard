import { NavLink, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  Globe,
  MonitorDot,
  Bell,
  Ticket,
  BarChart3,
  Users,
  Handshake,
  Settings,
  ChevronLeft,
  Wifi,
  type LucideIcon,
} from 'lucide-react'
import { useUIStore } from '@/store'
import { useAlertStore } from '@/store'

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

const NOC_NAV: NavSection[] = [
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
]

function NavItemRow({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { criticalCount } = useAlertStore()
  const badge = item.label === 'Alerts' ? criticalCount : item.badge

  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        clsx(
          'group flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-all',
          isActive
            ? 'border-l-2 border-brand bg-brand/5 text-brand'
            : 'border-l-2 border-transparent text-muted hover:bg-surface-2 hover:text-white',
        )
      }
    >
      <item.icon size={15} className="shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {badge ? (
            <span className="badge-critical ml-auto">{badge}</span>
          ) : null}
        </>
      )}
    </NavLink>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  return (
    <aside
      className={clsx(
        'relative flex flex-col border-r border-border bg-surface transition-all duration-200',
        sidebarCollapsed ? 'w-14' : 'w-52',
      )}
    >
      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className={clsx(
          'absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface-2 text-muted transition-all hover:text-white',
          sidebarCollapsed && 'rotate-180',
        )}
        aria-label="Toggle sidebar"
      >
        <ChevronLeft size={12} />
      </button>

      <nav className="flex-1 overflow-y-auto p-2 pt-3">
        {NOC_NAV.map((section) => (
          <div key={section.heading} className="mb-4">
            {!sidebarCollapsed && (
              <p className="mb-1 px-3 text-[9px] font-semibold uppercase tracking-widest text-dim">
                {section.heading}
              </p>
            )}
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
