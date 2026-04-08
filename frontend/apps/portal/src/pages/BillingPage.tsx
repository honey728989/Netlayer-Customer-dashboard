import { useMemo, useState } from 'react'
import { Download, ExternalLink, CreditCard, Calendar, TrendingUp, Wallet, Link2 } from 'lucide-react'
import { useAuthStore } from '@netlayer/auth'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { customersApi, type PaymentRecord } from '@netlayer/api'

const INR = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

const STATUS_COLOR: Record<string, string> = {
  PAID: 'var(--status-online)',
  UNPAID: 'var(--brand)',
  OVERDUE: 'var(--status-offline)',
  REQUESTED: 'var(--status-info)',
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
  const queryClient = useQueryClient()
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')

  const { data: billing, isLoading } = useQuery({
    queryKey: ['customers', customerId, 'billing'],
    queryFn: () => customersApi.getBilling(customerId),
    enabled: Boolean(customerId),
    staleTime: 60_000,
  })

  const { data: ledger } = useQuery({
    queryKey: ['customers', customerId, 'ledger'],
    queryFn: () => customersApi.getLedger(customerId),
    enabled: Boolean(customerId),
    staleTime: 60_000,
  })

  const { data: payments = [] } = useQuery({
    queryKey: ['customers', customerId, 'payments'],
    queryFn: () => customersApi.getPayments(customerId),
    enabled: Boolean(customerId),
    staleTime: 30_000,
  })

  const invoices: Invoice[] = (billing as any)?.invoices ?? []
  const summary = (billing as any)?.summary ?? {}
  const outstanding = Number(summary.outstanding ?? 0)
  const totalPaidYtd = Number(summary.totalPaidYtd ?? summary.total_paid_ytd ?? 0)
  const nextDueDate = summary.nextDueDate ?? summary.next_due_date

  const defaultPaymentAmount = useMemo(() => {
    if (selectedInvoiceId) {
      const invoice = invoices.find((item) => item.id === selectedInvoiceId)
      return Number(invoice?.total_amount ?? invoice?.amount ?? 0)
    }

    return outstanding
  }, [invoices, outstanding, selectedInvoiceId])

  const paymentLinkMutation = useMutation({
    mutationFn: () =>
      customersApi.createPaymentLink(customerId, {
        amount: defaultPaymentAmount || outstanding,
        invoiceId: selectedInvoiceId || undefined,
        description: selectedInvoiceId ? 'Portal payment request for invoice' : 'Portal payment request',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'payments'] })
      await queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'ledger'] })
    },
  })

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Billing</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Invoice history, ledger, and payment actions</p>
        </div>
        {(billing as any)?.portalUrl && (
          <a href={(billing as any).portalUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost gap-1.5">
            <ExternalLink size={13} /> Open Zoho Portal
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            label: 'Outstanding',
            value: isLoading ? '—' : outstanding ? INR(outstanding) : '₹0',
            icon: CreditCard,
            accent: outstanding > 0 ? 'var(--status-degraded)' : 'var(--status-online)',
          },
          {
            label: 'Next Due Date',
            value: isLoading ? '—' : nextDueDate ? new Date(nextDueDate).toLocaleDateString('en-IN') : '—',
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
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}
              >
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

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="card-title">Ledger Snapshot</h3>
            <span
              className="text-[10px] font-mono px-2 py-1 rounded"
              style={{
                color: 'var(--status-info)',
                backgroundColor: 'color-mix(in srgb, var(--status-info) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--status-info) 25%, transparent)',
              }}
            >
              Zoho Synced
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Invoiced', value: INR(Number(ledger?.invoicedAmount ?? 0)), icon: CreditCard },
              { label: 'Collected', value: INR(Number(ledger?.collectedAmount ?? 0)), icon: Wallet },
              { label: 'Outstanding', value: INR(Number(ledger?.outstandingAmount ?? 0)), icon: TrendingUp },
              { label: 'Pending Links', value: Number(ledger?.pendingPaymentLinks ?? 0), icon: Link2 },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <Icon size={13} style={{ color: 'var(--brand)' }} />
                </div>
                <p className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4 space-y-4">
          <div>
            <h3 className="card-title">Payment Action</h3>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Generate a secure payment link for an unpaid invoice or for your total outstanding amount.
            </p>
          </div>

          <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>
            Select Invoice
            <select value={selectedInvoiceId} onChange={(event) => setSelectedInvoiceId(event.target.value)} className="input-field mt-1">
              <option value="">Outstanding balance</option>
              {invoices
                .filter((invoice) => (invoice.status ?? '').toUpperCase() !== 'PAID')
                .map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {(invoice.invoice_number ?? invoice.invoiceNumber ?? invoice.id.slice(-6))} • {INR(Number(invoice.total_amount ?? invoice.amount ?? 0))}
                  </option>
                ))}
            </select>
          </label>

          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Amount</p>
            <p className="mt-1 font-mono text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {INR(defaultPaymentAmount || outstanding)}
            </p>
          </div>

          <button
            type="button"
            className="btn-primary w-full justify-center gap-1.5"
            disabled={paymentLinkMutation.isPending || !(defaultPaymentAmount || outstanding)}
            onClick={() => paymentLinkMutation.mutate()}
          >
            <Link2 size={13} />
            {paymentLinkMutation.isPending ? 'Generating...' : 'Generate Payment Link'}
          </button>

          {paymentLinkMutation.data ? (
            <a
              href={paymentLinkMutation.data.payment_link ?? paymentLinkMutation.data.paymentLink ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost w-full justify-center gap-1.5"
            >
              <ExternalLink size={13} /> Open Latest Payment Link
            </a>
          ) : null}
        </div>
      </div>

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
                Array.from({ length: 4 }).map((_, index) => (
                  <tr key={index} className="table-row">
                    {Array.from({ length: 6 }).map((_, cellIndex) => (
                      <td key={cellIndex} className="table-td">
                        <div className="skeleton h-4 rounded w-full max-w-[100px]" />
                      </td>
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
                invoices.map((invoice) => {
                  const status = (invoice.status ?? '').toUpperCase()
                  const color = STATUS_COLOR[status] ?? 'var(--text-muted)'
                  const amount = Number(invoice.total_amount ?? invoice.amount ?? 0)
                  const invoiceDate = invoice.invoice_date ?? invoice.date
                  const dueDate = invoice.due_date ?? invoice.dueDate
                  const pdfUrl = invoice.pdf_url ?? invoice.pdfUrl

                  return (
                    <tr key={invoice.id} className="table-row">
                      <td className="table-td">
                        <span className="font-mono text-[11px]" style={{ color: 'var(--brand)' }}>
                          {invoice.invoice_number ?? invoice.invoiceNumber ?? invoice.id.slice(-6)}
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
                        <span
                          className="inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded capitalize"
                          style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}
                        >
                          {status.toLowerCase()}
                        </span>
                      </td>
                      <td className="table-td">
                        {pdfUrl && (
                          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost py-1 gap-1 text-[11px]">
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

      <div className="card overflow-hidden">
        <div className="card-header">
          <h3 className="card-title">Recent Payments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
              <tr>
                <th className="table-th">Created</th>
                <th className="table-th">Method</th>
                <th className="table-th">Amount</th>
                <th className="table-th">Status</th>
                <th className="table-th w-24"></th>
              </tr>
            </thead>
            <tbody>
              {(payments as PaymentRecord[]).length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    No payment records yet
                  </td>
                </tr>
              ) : (
                (payments as PaymentRecord[]).slice(0, 6).map((payment) => {
                  const link = payment.payment_link ?? payment.paymentLink
                  return (
                    <tr key={payment.id} className="table-row">
                      <td className="table-td text-xs" style={{ color: 'var(--text-muted)' }}>
                        {(payment.created_at ?? payment.updated_at) ? new Date(payment.created_at ?? payment.updated_at ?? '').toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="table-td font-mono text-[11px]" style={{ color: 'var(--text-dim)' }}>
                        {payment.payment_method ?? payment.paymentMethod ?? 'Portal'}
                      </td>
                      <td className="table-td font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                        {INR(Number(payment.amount ?? 0))}
                      </td>
                      <td className="table-td">
                        <span
                          className="inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
                          style={{ color: 'var(--brand)', backgroundColor: 'color-mix(in srgb, var(--brand) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--brand) 25%, transparent)' }}
                        >
                          {String(payment.status ?? '').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="table-td">
                        {link ? (
                          <a href={link} target="_blank" rel="noopener noreferrer" className="btn-ghost py-1 gap-1 text-[11px]">
                            <ExternalLink size={11} /> Open
                          </a>
                        ) : '—'}
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
