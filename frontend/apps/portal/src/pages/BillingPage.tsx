import { Download, ExternalLink, CreditCard, Calendar, TrendingUp } from 'lucide-react'
import { useAuthStore } from '@netlayer/auth'
import { useQuery } from '@tanstack/react-query'
import { customersApi } from '@netlayer/api'

const INR = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)

const STATUS_COLOR: Record<string, string> = {
  PAID:    'var(--status-online)',
  UNPAID:  'var(--brand)',
  OVERDUE: 'var(--status-offline)',
}

interface Invoice {
  id: string
  invoice_number?: string
  invoiceNumber?: string
  invoice_date?: string
  date?: string
  due_date?: string
  dueDate?: string
  total_amount?: number
  amount?: number
  status: string
  pdf_url?: string
  pdfUrl?: string
}

export function BillingPage() {
  const { user } = useAuthStore()
  const customerId = user?.customerId ?? user?.organizationId ?? ''

  const { data: billing, isLoading } = useQuery({
    queryKey: ['customers', customerId, 'billing'],
    queryFn: () => customersApi.getBilling(customerId),
    enabled: Boolean(customerId),
    staleTime: 60_000,
  })

  const invoices: Invoice[] = (billing as any)?.invoices ?? []
  const summary = (billing as any)?.summary ?? {}
  const outstanding = Number(summary.outstanding ?? 0)
  const totalPaidYtd = Number(summary.totalPaidYtd ?? summary.total_paid_ytd ?? 0)
  const nextDueDate = summary.nextDueDate ?? summary.next_due_date

  return (
    <div className="space-y-5 p-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Billing</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Invoice history and payment status</p>
        </div>
        {(billing as any)?.portalUrl && (
          <a href={(billing as any).portalUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost gap-1.5">
            <ExternalLink size={13} /> Open Zoho Portal
          </a>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            label: 'Outstanding',
            value: isLoading ? '—' : (outstanding ? INR(outstanding) : '₹0'),
            icon: CreditCard,
            accent: outstanding > 0 ? 'var(--status-degraded)' : 'var(--status-online)',
          },
          {
            label: 'Next Due Date',
            value: isLoading ? '—' : (nextDueDate ? new Date(nextDueDate).toLocaleDateString('en-IN') : '—'),
            icon: Calendar,
            accent: 'var(--brand)',
          },
          {
            label: 'Total Paid (YTD)',
            value: isLoading ? '—' : INR(totalPaidYtd),
            icon: TrendingUp,
            accent: 'var(--status-online)',
          },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="metric-card" style={{ borderTop: `2px solid ${accent}` }}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>
                <Icon size={14} />
              </span>
            </div>
            {isLoading ? (
              <div className="skeleton h-7 w-24 rounded" />
            ) : (
              <p className="font-mono text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Invoice table */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <h3 className="card-title">Invoices</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
              <tr>
                <th className="table-th">Invoice #</th>
                <th className="table-th">Date</th>
                <th className="table-th">Due Date</th>
                <th className="table-th">Amount</th>
                <th className="table-th">Status</th>
                <th className="table-th w-20"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="table-row">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="table-td"><div className="skeleton h-4 rounded w-full max-w-[100px]" /></td>
                    ))}
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    No invoices found
                  </td>
                </tr>
              ) : (
                invoices.map((inv: Invoice) => {
                  const status = (inv.status ?? '').toUpperCase()
                  const color = STATUS_COLOR[status] ?? 'var(--text-muted)'
                  const amount = Number(inv.total_amount ?? inv.amount ?? 0)
                  const invoiceDate = inv.invoice_date ?? inv.date
                  const dueDate = inv.due_date ?? inv.dueDate
                  const pdfUrl = inv.pdf_url ?? inv.pdfUrl

                  return (
                    <tr key={inv.id} className="table-row">
                      <td className="table-td">
                        <span className="font-mono text-[11px]" style={{ color: 'var(--brand)' }}>
                          {inv.invoice_number ?? inv.invoiceNumber ?? inv.id.slice(-6)}
                        </span>
                      </td>
                      <td className="table-td text-xs" style={{ color: 'var(--text-muted)' }}>
                        {invoiceDate ? new Date(invoiceDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="table-td text-xs" style={{ color: 'var(--text-muted)' }}>
                        {dueDate ? new Date(dueDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="table-td">
                        <span className="font-mono text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {INR(amount)}
                        </span>
                      </td>
                      <td className="table-td">
                        <span className="inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded capitalize"
                              style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}>
                          {status.toLowerCase()}
                        </span>
                      </td>
                      <td className="table-td">
                        {pdfUrl && (
                          <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                             className="btn-ghost py-1 gap-1 text-[11px]">
                            <Download size={11} /> PDF
                          </a>
                        )}
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
  )
}
