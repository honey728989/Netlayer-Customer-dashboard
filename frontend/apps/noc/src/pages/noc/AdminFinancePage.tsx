import { useQuery } from '@tanstack/react-query'
import { CreditCard, Receipt, Wallet } from 'lucide-react'
import { customersApi, financeApi } from '@netlayer/api'

const INR = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

export function AdminFinancePage() {
  const { data: summary } = useQuery({
    queryKey: ['admin', 'finance', 'summary'],
    queryFn: () => financeApi.getSummary(),
  })

  const { data: customersRaw } = useQuery({
    queryKey: ['admin', 'customers', 'finance'],
    queryFn: () => customersApi.list({ pageSize: 50 }),
  })

  const customers = customersRaw?.data ?? []

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Finance Command Center</h1>
        <p className="mt-1 text-xs text-muted">Collections, overdue exposure, and account-level billing readiness</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: 'Outstanding', value: INR(summary?.invoices.totalOutstanding ?? 0), icon: Wallet },
          { label: 'Paid Invoices', value: summary?.invoices.paidInvoices ?? 0, icon: Receipt },
          { label: 'Overdue Invoices', value: summary?.invoices.overdueInvoices ?? 0, icon: CreditCard },
          { label: 'Pending Payments', value: summary?.payments.pending ?? 0, icon: Wallet },
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

      <div className="card overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-display text-sm font-semibold text-white">Customer Commercial Portfolio</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
              <tr>
                <th className="table-th">Customer</th>
                <th className="table-th">Tier</th>
                <th className="table-th">MRR</th>
                <th className="table-th">Contract Value</th>
                <th className="table-th">Billing Contact</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="table-row">
                  <td className="table-td">
                    <p className="text-xs font-medium text-white">{customer.name}</p>
                    <p className="font-mono text-[10px] text-dim">{customer.code ?? 'NA'}</p>
                  </td>
                  <td className="table-td text-xs text-muted">{customer.tier ?? 'Business'}</td>
                  <td className="table-td font-mono text-xs text-white">{INR(Number(customer.monthly_recurring_revenue ?? customer.monthlyArv ?? 0))}</td>
                  <td className="table-td font-mono text-xs text-white">{INR(Number(customer.annual_contract_value ?? customer.contractValue ?? 0))}</td>
                  <td className="table-td text-xs text-muted">{customer.email ?? 'Not synced'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
