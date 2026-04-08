import { Activity, Globe, Ticket as TicketIcon, TrendingUp, AlertTriangle, CreditCard, Server } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@netlayer/auth'
import { customersApi, sitesApi, ticketsApi, alertsApi } from '@netlayer/api'
import { formatDistanceToNow } from 'date-fns'
import type { Site, Ticket } from '@netlayer/api'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const INR = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  loading,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  accent: string
  loading?: boolean
}) {
  return (
    <div className="metric-card" style={{ borderTop: `2px solid ${accent}` }}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>
          <Icon size={14} />
        </span>
      </div>
      {loading ? (
        <div className="space-y-1.5">
          <div className="skeleton h-7 w-24 rounded" />
          <div className="skeleton h-3 w-16 rounded" />
        </div>
      ) : (
        <>
          <p className="font-mono text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
          {sub ? <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>{sub}</p> : null}
        </>
      )}
    </div>
  )
}

function SiteStatusDot({ status }: { status: string }) {
  const color = status === 'UP' || status === 'online'
    ? 'var(--status-online)'
    : status === 'DOWN' || status === 'offline'
      ? 'var(--status-offline)'
      : status === 'DEGRADED' || status === 'degraded'
        ? 'var(--status-degraded)'
        : 'var(--status-info)'

  return <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
}

export function CustomerDashboard() {
  const { user } = useAuthStore()
  const customerId = user?.customerId ?? user?.organizationId ?? ''

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['customer', customerId, 'overview'],
    queryFn: () => customersApi.getOverview(customerId),
    enabled: Boolean(customerId),
    staleTime: 60_000,
  })

  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ['sites', 'list', customerId],
    queryFn: () => sitesApi.list({ customerId }),
    enabled: Boolean(customerId),
    staleTime: 30_000,
  })

  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: ['tickets', 'list', customerId],
    queryFn: () => ticketsApi.list({ customerId, status: 'OPEN', pageSize: 5 }),
    enabled: Boolean(customerId),
    staleTime: 30_000,
  })

  const { data: alertCount } = useQuery({
    queryKey: ['alerts', 'count', customerId],
    queryFn: () => alertsApi.getActiveCount(),
    refetchInterval: 15_000,
  })

  const siteList = (Array.isArray(sites) ? sites : (sites as any)?.data ?? []) as Site[]
  const tickets = (ticketsData?.data ?? []) as Ticket[]
  const onlineSites = siteList.filter((site) => site.status === 'UP' || site.status === 'online').length
  const totalSites = siteList.length
  const uptimePct = totalSites ? Math.round((onlineSites / totalSites) * 1000) / 10 : 0

  const bandwidthTrend = Array.from({ length: 7 }, (_, index) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index],
    mbps: Math.round(Math.random() * 400 + 200),
  }))

  const customer = (overview as any)?.customer
  const mrr = Number(customer?.monthly_recurring_revenue ?? 0)

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Welcome back, {user?.name?.split(' ')[0] ?? 'User'}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {customer?.name ?? user?.organizationName ?? 'Customer Portal'} · SLA: {customer?.sla_profile ?? 'Standard'}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <span
            className="font-mono text-xs px-2.5 py-1 rounded-md"
            style={{ backgroundColor: 'color-mix(in srgb, var(--status-online) 10%, transparent)', color: 'var(--status-online)', border: '1px solid color-mix(in srgb, var(--status-online) 25%, transparent)' }}
          >
            ● Account Active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="SLA Uptime" value={`${uptimePct}%`} sub={uptimePct >= 99.5 ? 'Meeting SLA' : 'Below SLA target'} icon={Activity} accent="var(--status-online)" loading={sitesLoading} />
        <StatCard label="Total Sites" value={totalSites} sub={`${onlineSites} online · ${totalSites - onlineSites} offline`} icon={Globe} accent="var(--brand)" loading={sitesLoading} />
        <StatCard label="Open Tickets" value={tickets.length} sub={alertCount?.critical ? `${alertCount.critical} critical alerts` : 'No critical alerts'} icon={TicketIcon} accent="var(--status-info)" loading={ticketsLoading} />
        <StatCard label="Monthly Billing" value={mrr ? INR(mrr) : '—'} sub={`${customer?.sla_profile ?? ''} plan`} icon={CreditCard} accent="var(--status-degraded)" loading={overviewLoading} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2 card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="card-title">Bandwidth Usage - This Week</h3>
            <a href="/portal/reports/sla" className="text-[11px] hover:underline" style={{ color: 'var(--brand)' }}>Full report →</a>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={bandwidthTrend} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <defs>
                <linearGradient id="bwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-dim)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-dim)' }} unit=" M" />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                formatter={(value: number) => [`${value} Mbps`, 'Avg Bandwidth']}
              />
              <Area type="monotone" dataKey="mbps" stroke="var(--brand)" strokeWidth={2} fill="url(#bwGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4 space-y-3">
          <h3 className="card-title">Account Summary</h3>
          {[
            { label: 'Services Active', value: (overview as any)?.services?.active ?? '—', icon: Server, color: 'var(--status-online)' },
            { label: 'Active Alerts', value: alertCount?.total ?? 0, icon: AlertTriangle, color: alertCount?.critical ? 'var(--status-offline)' : 'var(--status-degraded)' },
            { label: 'Total Bandwidth', value: `${(overview as any)?.services?.totalBandwidthMbps ?? 0} Mbps`, icon: TrendingUp, color: 'var(--brand)' },
            { label: 'Account Manager', value: customer?.account_manager ?? '—', icon: Activity, color: 'var(--status-info)' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <Icon size={12} style={{ color }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
              </div>
              <span className="font-mono text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</span>
            </div>
          ))}
          <div className="pt-2 flex gap-2">
            <a href="/portal/sites" className="btn-ghost text-[11px] flex-1 justify-center">My Sites</a>
            <a href="/portal/billing" className="btn-ghost text-[11px] flex-1 justify-center">Billing</a>
          </div>
          <div className="flex gap-2">
            <a href="/portal/heatmap" className="btn-ghost text-[11px] flex-1 justify-center">Heat Map</a>
            <a href="/portal/feasibility" className="btn-ghost text-[11px] flex-1 justify-center">Feasibility</a>
          </div>
          <div className="flex gap-2">
            <a href="/portal/services" className="btn-ghost text-[11px] flex-1 justify-center">Services</a>
            <a href="/portal/notifications" className="btn-ghost text-[11px] flex-1 justify-center">Notifications</a>
          </div>
          <div className="flex gap-2">
            <a href="/portal/tickets/new" className="btn-ghost text-[11px] flex-1 justify-center">Raise Ticket</a>
            <a href="/portal/billing" className="btn-ghost text-[11px] flex-1 justify-center">Pay Now</a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">My Sites</h3>
            <a href="/portal/sites" className="text-[11px] hover:underline" style={{ color: 'var(--brand)' }}>All sites →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody>
                {sitesLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <tr key={index} className="table-row">
                      <td className="table-td"><div className="skeleton h-4 rounded w-32" /></td>
                      <td className="table-td"><div className="skeleton h-4 rounded w-16" /></td>
                      <td className="table-td"><div className="skeleton h-4 rounded w-12" /></td>
                    </tr>
                  ))
                ) : siteList.length === 0 ? (
                  <tr><td colSpan={3} className="py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No sites found</td></tr>
                ) : (
                  siteList.slice(0, 5).map((site) => (
                    <tr key={site.id} className="table-row">
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <SiteStatusDot status={site.status} />
                          <div>
                            <p className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>{site.name}</p>
                            <p className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>{site.city ?? site.state ?? ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-td text-right font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                        {site.total_bandwidth_mbps ?? site.bandwidth_mbps ?? '—'} Mbps
                      </td>
                      <td className="table-td text-right">
                        <a href={`/portal/sites/${site.id}`} className="text-[11px] hover:underline" style={{ color: 'var(--brand)' }}>View</a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Open Tickets</h3>
            <a href="/portal/tickets" className="text-[11px] hover:underline" style={{ color: 'var(--brand)' }}>All tickets →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody>
                {ticketsLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <tr key={index} className="table-row">
                      <td className="table-td"><div className="skeleton h-4 rounded w-40" /></td>
                      <td className="table-td"><div className="skeleton h-4 rounded w-20" /></td>
                      <td className="table-td"><div className="skeleton h-4 rounded w-12" /></td>
                    </tr>
                  ))
                ) : tickets.length === 0 ? (
                  <tr><td colSpan={3} className="py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No open tickets</td></tr>
                ) : (
                  tickets.map((ticket) => (
                    <tr key={ticket.id} className="table-row">
                      <td className="table-td">
                        <p className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>{ticket.title ?? ticket.subject}</p>
                        <p className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
                          {formatDistanceToNow(new Date(ticket.created_at ?? ticket.createdAt ?? Date.now()), { addSuffix: true })}
                        </p>
                      </td>
                      <td className="table-td w-20 text-right">
                        <span className="font-mono text-[10px]" style={{ color: 'var(--status-offline)' }}>{ticket.priority}</span>
                      </td>
                      <td className="table-td text-right">
                        <a href={`/portal/tickets/${ticket.id}`} className="text-[11px] hover:underline" style={{ color: 'var(--brand)' }}>Open</a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
