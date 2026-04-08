import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2, CreditCard, FileText, Network, ShieldCheck, Ticket, Users } from 'lucide-react'
import { customersApi, sitesApi, ticketsApi } from '@netlayer/api'

const INR = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

export function AdminCustomerDetailPage() {
  const { customerId = '' } = useParams()

  const { data: customer } = useQuery({
    queryKey: ['admin', 'customer', customerId],
    queryFn: () => customersApi.getById(customerId),
    enabled: Boolean(customerId),
  })

  const { data: overview } = useQuery({
    queryKey: ['admin', 'customer', customerId, 'overview'],
    queryFn: () => customersApi.getOverview(customerId),
    enabled: Boolean(customerId),
  })

  const { data: services = [] } = useQuery({
    queryKey: ['admin', 'customer', customerId, 'services'],
    queryFn: () => customersApi.getServices(customerId),
    enabled: Boolean(customerId),
  })

  const { data: sitesRaw } = useQuery({
    queryKey: ['admin', 'customer', customerId, 'sites'],
    queryFn: () => sitesApi.list({ pageSize: 200 }),
    enabled: Boolean(customerId),
  })

  const { data: ticketsRaw } = useQuery({
    queryKey: ['admin', 'customer', customerId, 'tickets'],
    queryFn: () => ticketsApi.list({ pageSize: 200 }),
    enabled: Boolean(customerId),
  })

  const { data: billing } = useQuery({
    queryKey: ['admin', 'customer', customerId, 'billing'],
    queryFn: () => customersApi.getBilling(customerId),
    enabled: Boolean(customerId),
  })

  const { data: users = [] } = useQuery({
    queryKey: ['admin', 'customer', customerId, 'portal-users'],
    queryFn: () => customersApi.getPortalUsers(customerId),
    enabled: Boolean(customerId),
  })

  const sites = (sitesRaw?.data ?? []).filter((site) => (site.customer_id ?? site.customerId) === customerId)
  const tickets = (ticketsRaw?.data ?? []).filter((ticket) => (ticket.customer_id ?? ticket.customerId) === customerId)
  const openTickets = tickets.filter((ticket) => !['RESOLVED', 'CLOSED', 'resolved', 'closed'].includes(ticket.status))
  const billedAmount = Array.isArray(billing)
    ? billing.reduce((sum, invoice) => sum + Number(invoice.total_amount ?? invoice.amount ?? 0), 0)
    : 0

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: 'var(--text-dim)' }}>Customer 360</p>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {customer?.name ?? 'Customer Workspace'}
          </h1>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {(customer?.code ?? 'No code')} · {(customer?.tier ?? 'Business')} · {(customer?.sla_profile ?? 'SLA not set')}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/noc/customers" className="btn-ghost">Back to Customers</Link>
          <Link to={`/noc/customers/${customerId}/sites/new`} className="btn-ghost">Add Site</Link>
          <Link to="/portal" className="btn-primary">Portal View</Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: 'Active Sites', value: sites.length, icon: Building2 },
          { label: 'Open Tickets', value: openTickets.length, icon: Ticket },
          { label: 'Live Services', value: services.length, icon: Network },
          { label: 'Billed Portfolio', value: INR(billedAmount), icon: CreditCard },
        ].map((item) => (
          <div key={item.label} className="card px-4 py-3">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <item.icon size={16} />
            </div>
            <p className="font-mono text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <div className="card p-4">
            <div className="mb-4 flex items-center gap-2">
              <Users size={14} className="text-brand" />
              <h2 className="font-display text-sm font-semibold">Customer Snapshot</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-widest text-dim">Account Manager</p>
                <p className="mt-1 text-sm text-white">{customer?.account_manager ?? customer?.accountManagerName ?? 'Unassigned'}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-widest text-dim">Partner</p>
                <p className="mt-1 text-sm text-white">{customer?.partner_name ?? customer?.partnerName ?? 'Direct'}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-widest text-dim">Health</p>
                <p className="mt-1 text-sm text-white">{String(overview?.networkHealth ?? 'Operational')}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-widest text-dim">Risk Flags</p>
                <p className="mt-1 text-sm text-white">{String(overview?.riskFlags ?? 'No escalations')}</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="mb-4 flex items-center gap-2">
              <Network size={14} className="text-brand" />
              <h2 className="font-display text-sm font-semibold">Sites & Services</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-widest text-dim">Top Sites</p>
                <div className="mt-2 space-y-2 text-xs">
                  {sites.slice(0, 4).map((site) => (
                    <Link key={site.id} to={`/noc/sites/${site.id}`} className="flex items-center justify-between hover:text-white">
                      <span>{site.name}</span>
                      <span className="font-mono text-dim">{site.city ?? 'NA'}</span>
                    </Link>
                  ))}
                  {sites.length === 0 ? <p className="text-dim">No sites mapped</p> : null}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-widest text-dim">Service Mix</p>
                <div className="mt-2 space-y-2 text-xs">
                  {services.slice(0, 4).map((service) => (
                    <div key={service.id} className="flex items-center justify-between">
                      <span>{service.service_type ?? 'ILL'}</span>
                      <span className="font-mono text-dim">{service.bandwidth_mbps ?? 0} Mbps</span>
                    </div>
                  ))}
                  {services.length === 0 ? <p className="text-dim">No active services</p> : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck size={14} className="text-brand" />
              <h2 className="font-display text-sm font-semibold">Portal Governance</h2>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2">
                <span>Portal Users</span>
                <span className="font-mono">{users.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2">
                <span>Scoped Users</span>
                <span className="font-mono">{users.filter((user) => user.scopeMode === 'SELECTED_SITES').length}</span>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="mb-4 flex items-center gap-2">
              <FileText size={14} className="text-brand" />
              <h2 className="font-display text-sm font-semibold">Operational Queue</h2>
            </div>
            <div className="space-y-2 text-xs">
              {openTickets.slice(0, 5).map((ticket) => (
                <div key={ticket.id} className="rounded-lg border border-border bg-surface-2 px-3 py-2">
                  <p className="font-medium text-white">{ticket.title ?? ticket.subject ?? ticket.description}</p>
                  <p className="mt-1 font-mono text-[10px] text-dim">
                    {ticket.priority} · {(ticket.site_name ?? ticket.siteName ?? 'No site')} · {ticket.status}
                  </p>
                </div>
              ))}
              {openTickets.length === 0 ? <p className="text-dim">No open escalations</p> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
