import { Cable, Database, ShieldCheck, Wallet } from 'lucide-react'

const integrations = [
  { name: 'Zabbix', detail: 'Primary alert and SNMP source for all monitored nodes', icon: ShieldCheck, status: 'Connected' },
  { name: 'Grafana', detail: 'Customer and NOC embedded dashboards for bandwidth and SLA trend', icon: Cable, status: 'Connected' },
  { name: 'Zoho Books', detail: 'Invoice, ledger, and reconciliation source for finance operations', icon: Wallet, status: 'Connected' },
  { name: 'Postgres / Redis', detail: 'Core platform persistence and queue durability', icon: Database, status: 'Healthy' },
]

export function AdminSettingsPage() {
  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Platform Settings</h1>
        <p className="mt-1 text-xs text-muted">Integration posture, policy controls, and admin governance</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="card p-4">
          <h2 className="font-display text-sm font-semibold text-white">Integration Registry</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {integrations.map((integration) => (
              <div key={integration.name} className="rounded-lg border border-border bg-surface-2 p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <integration.icon size={16} />
                </div>
                <p className="text-sm font-semibold text-white">{integration.name}</p>
                <p className="mt-1 text-xs text-muted">{integration.detail}</p>
                <p className="mt-3 text-[10px] uppercase tracking-widest text-brand">{integration.status}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="font-display text-sm font-semibold text-white">Access Policy</h2>
            <div className="mt-3 space-y-2 text-xs">
              <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-muted">Admin roles inherit full NOC, sales, finance, and feasibility permissions.</div>
              <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-muted">Customer branch users are restricted by site-scoped enforcement.</div>
              <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-muted">Partner users only access partner-owned leads, commissions, and customer summaries.</div>
            </div>
          </div>

          <div className="card p-4">
            <h2 className="font-display text-sm font-semibold text-white">Next Admin Actions</h2>
            <div className="mt-3 space-y-2 text-xs text-muted">
              <p>Review feasibility queue for survey capacity alignment.</p>
              <p>Monitor overdue invoices before monthly billing cycle close.</p>
              <p>Audit partner commission approval and lead conversion hygiene.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
