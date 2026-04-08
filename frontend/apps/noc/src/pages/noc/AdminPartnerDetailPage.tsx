import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Handshake, LineChart, Users, Wallet } from 'lucide-react'
import { partnersApi, type Lead } from '@netlayer/api'

const INR = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

export function AdminPartnerDetailPage() {
  const { partnerId = '' } = useParams()

  const { data: partner } = useQuery({
    queryKey: ['admin', 'partner', partnerId],
    queryFn: () => partnersApi.getById(partnerId),
    enabled: Boolean(partnerId),
  })

  const { data: stats } = useQuery({
    queryKey: ['admin', 'partner', partnerId, 'dashboard'],
    queryFn: () => partnersApi.getDashboardStats(partnerId),
    enabled: Boolean(partnerId),
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['admin', 'partner', partnerId, 'customers'],
    queryFn: () => partnersApi.getCustomers(partnerId),
    enabled: Boolean(partnerId),
  })

  const { data: leads = [] } = useQuery({
    queryKey: ['admin', 'partner', partnerId, 'leads'],
    queryFn: () => partnersApi.getLeads(partnerId),
    enabled: Boolean(partnerId),
  })

  const { data: commissions = [] } = useQuery({
    queryKey: ['admin', 'partner', partnerId, 'commissions'],
    queryFn: () => partnersApi.getCommissions(partnerId),
    enabled: Boolean(partnerId),
  })

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-dim">Partner 360</p>
          <h1 className="font-display text-2xl font-bold text-white">{partner?.name ?? 'Partner Workspace'}</h1>
          <p className="mt-1 text-xs text-muted">
            {(partner?.tier ?? 'Standard')} · {(partner?.region ?? partner?.city ?? 'Unassigned region')} · {(partner?.commission_plan ?? 'Standard commission')}
          </p>
        </div>
        <Link to="/noc/partners" className="btn-ghost">Back to Partners</Link>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: 'Active Customers', value: stats?.customers?.active ?? customers.length, icon: Users },
          { label: 'Monthly Revenue', value: INR(stats?.customers?.monthlyRevenue ?? 0), icon: LineChart },
          { label: 'Pending Commission', value: INR(stats?.commissions?.pending ?? 0), icon: Wallet },
          { label: 'Lead Pipeline', value: stats?.leads?.total ?? leads.length, icon: Handshake },
        ].map((item) => (
          <div key={item.label} className="card px-4 py-3">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <item.icon size={16} />
            </div>
            <p className="font-mono text-xl font-bold text-white">{item.value}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card p-4">
          <h2 className="font-display text-sm font-semibold text-white">Managed Customers</h2>
          <div className="mt-3 space-y-2 text-xs">
            {customers.slice(0, 6).map((customer) => (
              <Link key={customer.id} to={`/noc/customers/${customer.id}`} className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 hover:text-white">
                <span>{customer.name}</span>
                <span className="font-mono text-dim">{customer.site_count ?? 0} sites</span>
              </Link>
            ))}
            {customers.length === 0 ? <p className="text-dim">No customers mapped</p> : null}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="font-display text-sm font-semibold text-white">Commercial Pipeline</h2>
          <div className="mt-3 space-y-2 text-xs">
            {leads.slice(0, 6).map((lead: Lead) => (
              <div key={lead.id} className="rounded-lg border border-border bg-surface-2 px-3 py-2">
                <p className="font-medium text-white">{lead.company_name ?? lead.companyName ?? 'Lead'}</p>
                <p className="mt-1 font-mono text-[10px] text-dim">
                  {lead.stage} · {(lead.city ?? 'NA')} · {INR(Number(lead.expected_value ?? lead.expected_mrc ?? 0))}
                </p>
              </div>
            ))}
            {leads.length === 0 ? <p className="text-dim">No active leads</p> : null}
          </div>
        </div>

        <div className="card p-4 xl:col-span-2">
          <h2 className="font-display text-sm font-semibold text-white">Commission Ledger</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {commissions.slice(0, 6).map((commission) => (
              <div key={commission.id} className="rounded-lg border border-border bg-surface-2 p-3 text-xs">
                <p className="font-mono text-[10px] uppercase tracking-widest text-dim">{commission.commission_period ?? commission.month}</p>
                <p className="mt-2 text-sm font-semibold text-white">{INR(Number(commission.commission_amount ?? commission.commissionAmount ?? 0))}</p>
                <p className="mt-1 text-dim">{commission.status}</p>
              </div>
            ))}
            {commissions.length === 0 ? <p className="text-dim">No commission history</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
