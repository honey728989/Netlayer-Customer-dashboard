import { Users, TrendingUp, IndianRupee, Clock, Activity } from 'lucide-react'
import { useAuthStore } from '@netlayer/auth'
import { useQuery } from '@tanstack/react-query'
import { partnersApi } from '@netlayer/api'
import type { Lead, Commission } from '@netlayer/api'

const INR = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)

// ── helpers to handle both snake_case and camelCase ──────────────────────────

function leadCompany(l: Lead) { return l.company_name ?? l.companyName ?? '—' }
function leadService(l: Lead) { return l.service_type ?? l.serviceType ?? '' }
function leadBw(l: Lead)      { return l.bandwidth_required_mbps ?? l.bandwidthRequiredMbps ?? l.bandwidth_mbps ?? 0 }
function leadValue(l: Lead)   { return Number(l.expected_mrc ?? l.expected_value ?? l.estimatedValue ?? 0) }

function commPeriod(c: Commission) { return c.commission_period ?? c.month ?? '—' }
function commAmount(c: Commission) { return Number(c.commission_amount ?? c.commissionAmount ?? 0) }

// ── Stage badge ───────────────────────────────────────────────────────────────

const STAGE_COLOR: Record<string, string> = {
  new: 'var(--brand)', qualified: 'var(--status-info)', proposal: 'var(--status-degraded)',
  negotiation: '#a855f7', won: 'var(--status-online)', lost: 'var(--status-offline)',
}

function StageBadge({ stage }: { stage: string }) {
  const color = STAGE_COLOR[stage?.toLowerCase()] ?? 'var(--text-muted)'
  return (
    <span className="inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded capitalize"
          style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}>
      {stage}
    </span>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, accent, loading }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent: string; loading?: boolean
}) {
  return (
    <div className="metric-card" style={{ borderTop: `2px solid ${accent}` }}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>
          <Icon size={14} />
        </span>
      </div>
      {loading ? (
        <div className="space-y-1.5"><div className="skeleton h-7 w-24 rounded" /><div className="skeleton h-3 w-16 rounded" /></div>
      ) : (
        <>
          <p className="font-mono text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
          {sub && <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
        </>
      )}
    </div>
  )
}

// ── Pipeline mini-kanban summary ──────────────────────────────────────────────

const STAGE_ORDER = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost']

export function PartnerDashboard() {
  const { user } = useAuthStore()
  const partnerId = user?.partnerId ?? user?.organizationId ?? ''

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['partners', partnerId, 'stats'],
    queryFn: () => partnersApi.getDashboardStats(partnerId),
    enabled: Boolean(partnerId),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const { data: leadsRaw, isLoading: leadsLoading } = useQuery({
    queryKey: ['partners', partnerId, 'leads', 'recent'],
    queryFn: () => partnersApi.getLeads(partnerId, { pageSize: 8 }),
    enabled: Boolean(partnerId),
    staleTime: 30_000,
  })

  const { data: commissionsRaw, isLoading: commissionsLoading } = useQuery({
    queryKey: ['partners', partnerId, 'commissions'],
    queryFn: () => partnersApi.getCommissions(partnerId, { pageSize: 6 }),
    enabled: Boolean(partnerId),
    staleTime: 60_000,
  })

  const leads = (Array.isArray(leadsRaw) ? leadsRaw : (leadsRaw as any)?.data ?? []) as Lead[]
  const commissions = (Array.isArray(commissionsRaw) ? commissionsRaw : (commissionsRaw as any)?.data ?? []) as Commission[]

  const s = stats as any
  const totalClients    = s?.totalClients    ?? s?.total_clients    ?? '—'
  const monthlyRevenue  = Number(s?.monthlyRevenue   ?? s?.monthly_revenue   ?? 0)
  const pendingComm     = Number(s?.pendingCommission ?? s?.pending_commission ?? 0)
  const activeLeads     = s?.activeLeads     ?? s?.active_leads     ?? leads.filter(l => !['won','lost'].includes(l.stage?.toLowerCase())).length
  const convRate        = s?.conversionRate  ?? s?.conversion_rate  ?? '—'
  const pendingInstalls = s?.pendingInstalls ?? s?.pending_installs ?? '—'

  return (
    <div className="space-y-5 p-5 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Partner Dashboard</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{user?.organizationName ?? ''}</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <StatCard label="Total Clients" value={totalClients} icon={Users} accent="var(--brand)" loading={statsLoading} />
        <StatCard label="Monthly Revenue" value={monthlyRevenue ? INR(monthlyRevenue) : '—'} icon={IndianRupee} accent="var(--status-online)" loading={statsLoading} />
        <StatCard label="Pending Commission" value={pendingComm ? INR(pendingComm) : '—'} icon={TrendingUp} accent="var(--status-degraded)" loading={statsLoading} />
        <StatCard label="Active Leads" value={activeLeads} icon={Activity} accent="var(--status-info)" loading={statsLoading} />
        <StatCard label="Conversion Rate" value={convRate !== '—' ? `${convRate}%` : '—'} sub="Last 90 days" icon={TrendingUp} accent="var(--brand)" loading={statsLoading} />
        <StatCard label="Pending Installs" value={pendingInstalls} icon={Clock} accent="var(--status-offline)" loading={statsLoading} />
      </div>

      {/* Pipeline summary */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="card-title">Sales Pipeline</h3>
          <a href="/partner/pipeline" className="text-[11px] hover:underline" style={{ color: 'var(--brand)' }}>Full pipeline →</a>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {STAGE_ORDER.map(stage => {
            const count = leads.filter(l => (l.stage ?? '').toLowerCase() === stage).length
            const color = STAGE_COLOR[stage] ?? 'var(--text-muted)'
            return (
              <div key={stage} className="rounded-md p-3 text-center" style={{ backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
                <div className="mx-auto mb-1.5 h-0.5 w-8 rounded-full" style={{ background: color }} />
                <p className="font-mono text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{count}</p>
                <p className="mt-0.5 text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>{stage}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Leads + Commissions grid */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">

        {/* Recent leads */}
        <div className="card overflow-hidden">
          <div className="card-header">
            <h3 className="card-title">Recent Leads</h3>
            <a href="/partner/pipeline" className="text-[11px] hover:underline" style={{ color: 'var(--brand)' }}>All leads →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody>
                {leadsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="table-row">
                      <td className="table-td"><div className="skeleton h-4 rounded w-32" /></td>
                      <td className="table-td"><div className="skeleton h-4 rounded w-16" /></td>
                    </tr>
                  ))
                ) : leads.length === 0 ? (
                  <tr><td colSpan={3} className="py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No leads yet</td></tr>
                ) : (
                  leads.slice(0, 6).map(l => (
                    <tr key={l.id} className="table-row">
                      <td className="table-td">
                        <p className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>{leadCompany(l)}</p>
                        <p className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
                          {leadService(l)}{leadBw(l) ? ` · ${leadBw(l)}M` : ''}
                        </p>
                      </td>
                      <td className="table-td text-right">
                        <StageBadge stage={l.stage} />
                      </td>
                      <td className="table-td text-right font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                        {leadValue(l) > 0 ? INR(leadValue(l)) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Commissions */}
        <div className="card overflow-hidden">
          <div className="card-header">
            <h3 className="card-title">Commission History</h3>
            <a href="/partner/commissions" className="text-[11px] hover:underline" style={{ color: 'var(--brand)' }}>Full history →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody>
                {commissionsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="table-row">
                      <td className="table-td"><div className="skeleton h-4 rounded w-24" /></td>
                      <td className="table-td"><div className="skeleton h-4 rounded w-20" /></td>
                    </tr>
                  ))
                ) : commissions.length === 0 ? (
                  <tr><td colSpan={3} className="py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No commissions yet</td></tr>
                ) : (
                  commissions.slice(0, 6).map(c => {
                    const status = (c.status ?? '').toLowerCase()
                    const color = status === 'paid' ? 'var(--status-online)' : status === 'approved' ? 'var(--brand)' : 'var(--text-muted)'
                    return (
                      <tr key={c.id} className="table-row">
                        <td className="table-td">
                          <p className="font-mono text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{commPeriod(c)}</p>
                        </td>
                        <td className="table-td text-right font-mono text-sm font-semibold" style={{ color: 'var(--status-online)' }}>
                          {INR(commAmount(c))}
                        </td>
                        <td className="table-td text-right">
                          <span className="inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded capitalize"
                                style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
