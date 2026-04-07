import { Users, TrendingUp, IndianRupee, Clock } from 'lucide-react'
import { useAuthStore } from '@netlayer/auth'
import { usePartnerStats, usePartnerLeads, usePartnerCommissions } from '@/hooks/useQueries'
import { KpiCard, Card, DataTable, type Column } from '@netlayer/ui'
import type { Lead, Commission } from '@netlayer/api'
import { formatDistanceToNow } from 'date-fns'

const STAGE_STYLE: Record<Lead['stage'], string> = {
  new: 'bg-brand/10 text-brand border-brand/25',
  qualified: 'bg-status-info/10 text-status-info border-status-info/25',
  proposal: 'bg-status-degraded/10 text-status-degraded border-status-degraded/25',
  negotiation: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
  won: 'bg-status-online/10 text-status-online border-status-online/25',
  lost: 'bg-status-offline/10 text-status-offline border-status-offline/25',
}

function StageBadge({ stage }: { stage: Lead['stage'] }) {
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold capitalize ${STAGE_STYLE[stage]}`}>
      {stage}
    </span>
  )
}

const LEAD_COLS: Column<Lead>[] = [
  {
    key: 'company',
    header: 'Company',
    render: (l) => (
      <div>
        <p className="text-xs font-medium text-white">{l.companyName}</p>
        <p className="text-[10px] text-muted">{l.contactName} · {l.contactEmail}</p>
      </div>
    ),
  },
  { key: 'service', header: 'Service', width: '140px', render: (l) => <span className="font-mono text-[10px] text-muted">{l.serviceType} · {l.bandwidthRequiredMbps}M</span> },
  { key: 'stage', header: 'Stage', width: '110px', render: (l) => <StageBadge stage={l.stage} /> },
  {
    key: 'value',
    header: 'Est. Value',
    width: '100px',
    render: (l) => (
      <span className="font-mono text-xs">
        ₹{(l.estimatedValue / 100).toLocaleString('en-IN')}
      </span>
    ),
  },
  {
    key: 'updated',
    header: 'Updated',
    width: '110px',
    render: (l) => (
      <span className="font-mono text-[10px] text-muted">
        {formatDistanceToNow(new Date(l.updatedAt), { addSuffix: true })}
      </span>
    ),
  },
]

const COMMISSION_COLS: Column<Commission>[] = [
  { key: 'month', header: 'Month', width: '100px', render: (c) => <span className="font-mono text-xs">{c.month}</span> },
  { key: 'revenue', header: 'Revenue', width: '120px', render: (c) => <span className="font-mono text-xs">₹{(c.totalRevenue / 100).toLocaleString('en-IN')}</span> },
  { key: 'rate', header: 'Rate', width: '70px', render: (c) => <span className="font-mono text-xs text-muted">{c.commissionRate}%</span> },
  { key: 'amount', header: 'Commission', width: '120px', render: (c) => <span className="font-mono text-xs text-status-online">₹{(c.commissionAmount / 100).toLocaleString('en-IN')}</span> },
  {
    key: 'status',
    header: 'Status',
    width: '90px',
    render: (c) => (
      <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold capitalize ${
        c.status === 'paid'
          ? 'bg-status-online/10 text-status-online border-status-online/25'
          : c.status === 'approved'
          ? 'bg-brand/10 text-brand border-brand/25'
          : 'bg-surface-2 text-muted border-border'
      }`}>
        {c.status}
      </span>
    ),
  },
]

export function PartnerDashboard() {
  const { user } = useAuthStore()
  const partnerId = user?.organizationId ?? ''

  const { data: stats, isLoading: statsLoading } = usePartnerStats(partnerId)
  const { data: leads, isLoading: leadsLoading } = usePartnerLeads(partnerId, { pageSize: 8, sortBy: 'updatedAt', sortOrder: 'desc' })
  const { data: commissions, isLoading: commissionsLoading } = usePartnerCommissions(partnerId, { pageSize: 6 })

  return (
    <div className="space-y-5 p-5">
      <div>
        <h1 className="font-display text-lg font-semibold text-white">
          Partner Dashboard
        </h1>
        <p className="text-xs text-muted">{user?.organizationName}</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        <KpiCard
          label="Total Clients"
          value={stats?.totalClients ?? '—'}
          loading={statsLoading}
          icon={<Users size={14} />}
          accentColor="#00d4ff"
        />
        <KpiCard
          label="Monthly Revenue"
          value={stats ? `₹${(stats.monthlyRevenue / 100).toLocaleString('en-IN')}` : '—'}
          loading={statsLoading}
          icon={<IndianRupee size={14} />}
          accentColor="#00e676"
        />
        <KpiCard
          label="Pending Commission"
          value={stats ? `₹${(stats.pendingCommission / 100).toLocaleString('en-IN')}` : '—'}
          loading={statsLoading}
          accentColor="#ffb300"
        />
        <KpiCard
          label="Active Leads"
          value={stats?.activeLeads ?? '—'}
          loading={statsLoading}
          icon={<TrendingUp size={14} />}
          accentColor="#9c7bff"
        />
        <KpiCard
          label="Conversion Rate"
          value={stats ? `${stats.conversionRate}%` : '—'}
          loading={statsLoading}
          accentColor="#00d4ff"
          trend={{ value: 'Last 90 days', direction: 'neutral' }}
        />
        <KpiCard
          label="Pending Installs"
          value={stats?.pendingInstalls ?? '—'}
          loading={statsLoading}
          icon={<Clock size={14} />}
          accentColor="#ff4d4d"
        />
      </div>

      {/* Pipeline Kanban summary */}
      <Card title="Sales Pipeline" action={<a href="/partner/pipeline" className="text-[11px] text-brand hover:underline">Full pipeline →</a>}>
        <div className="grid grid-cols-6 gap-2">
          {(['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as Lead['stage'][]).map((stage) => {
            const count = leads?.data.filter((l) => l.stage === stage).length ?? 0
            return (
              <div key={stage} className="rounded-md bg-surface-2 p-3 text-center">
                <p className="font-mono text-lg font-medium text-white">{count}</p>
                <p className="mt-0.5 text-[10px] capitalize text-muted">{stage}</p>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Recent leads */}
        <Card
          title="Recent Leads"
          action={<a href="/partner/pipeline/leads" className="text-[11px] text-brand hover:underline">All leads →</a>}
          noPadding
        >
          <DataTable
            columns={LEAD_COLS}
            data={leads?.data ?? []}
            keyExtractor={(l) => l.id}
            loading={leadsLoading}
            emptyTitle="No leads yet"
            emptyDescription="Add your first lead from the pipeline page."
          />
        </Card>

        {/* Commissions */}
        <Card
          title="Commission History"
          action={<a href="/partner/commissions" className="text-[11px] text-brand hover:underline">Full history →</a>}
          noPadding
        >
          <DataTable
            columns={COMMISSION_COLS}
            data={commissions?.data ?? []}
            keyExtractor={(c) => c.id}
            loading={commissionsLoading}
            emptyTitle="No commissions yet"
          />
        </Card>
      </div>
    </div>
  )
}
