import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, ExternalLink, CreditCard, Calendar, TrendingUp, Wallet, Link2, Building2, Layers3 } from 'lucide-react'
import { useAuthStore } from '@netlayer/auth'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { customersApi, type BillingInvoice, type PaymentRecord, type SiteBillingSummary } from '@netlayer/api'
import { useCustomerPortalSiteFilterStore } from '../../../noc/src/store'

const INR = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

const STATUS_COLOR: Record<string, string> = {
  PAID: 'var(--status-online)',
  UNPAID: 'var(--brand)',
  OVERDUE: 'var(--status-offline)',
  REQUESTED: 'var(--status-info)',
}

export function BillingPage() {
  const { user } = useAuthStore()
  const customerId = user?.customerId ?? user?.organizationId ?? ''
  const queryClient = useQueryClient()
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const { selectedSiteId, selectedSiteName, city, status } = useCustomerPortalSiteFilterStore()

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

  const { data: siteBilling = [] } = useQuery({
    queryKey: ['customers', customerId, 'site-billing'],
    queryFn: () => customersApi.getSiteBilling(customerId),
    enabled: Boolean(customerId),
    staleTime: 60_000,
  })

  const invoices: BillingInvoice[] = (billing as any)?.invoices ?? (Array.isArray(billing) ? billing : [])
  const summary = (billing as any)?.summary ?? {}
  const outstanding = Number(summary.outstanding ?? ledger?.outstandingAmount ?? 0)
  const totalPaidYtd = Number(summary.totalPaidYtd ?? summary.total_paid_ytd ?? ledger?.collectedAmount ?? 0)
  const nextDueDate = summary.nextDueDate ?? summary.next_due_date
  const portalUrl = (billing as any)?.portalUrl

  const filteredSiteBilling = useMemo(() => {
    return (siteBilling as SiteBillingSummary[]).filter((site) => {
      if (selectedSiteId && site.siteId !== selectedSiteId) return false
      if (city && site.city !== city) return false
      if (status && site.status !== status) return false
      return true
    })
  }, [city, selectedSiteId, siteBilling, status])

  const siteBillingSummary = useMemo(() => {
    const totalRecurring = filteredSiteBilling.reduce((sum, site) => sum + Number(site.monthlyRecurringAmount ?? 0), 0)
    const totalEstimatedOutstanding = filteredSiteBilling.reduce((sum, site) => sum + Number(site.estimatedOutstandingAmount ?? 0), 0)
    const totalBandwidth = filteredSiteBilling.reduce((sum, site) => sum + Number(site.totalBandwidthMbps ?? 0), 0)
    const totalServices = filteredSiteBilling.reduce((sum, site) => sum + Number(site.serviceCount ?? 0), 0)

    return {
      siteCount: filteredSiteBilling.length,
      totalRecurring,
      totalEstimatedOutstanding,
      totalBandwidth,
      totalServices,
    }
  }, [filteredSiteBilling])

  const siteContextLabel = selectedSiteName ?? (city ? `${city} sites` : 'All sites')

  const defaultPaymentAmount = useMemo(() => {
    if (selectedInvoiceId) {
      const invoice = invoices.find((item) => item.id === selectedInvoiceId)
      return Number(invoice?.total_amount ?? invoice?.amount ?? 0)
    }

    if (selectedSiteId && filteredSiteBilling.length > 0) {
      return Number(filteredSiteBilling[0]?.estimatedOutstandingAmount ?? 0)
    }

    return outstanding
  }, [filteredSiteBilling, invoices, outstanding, selectedInvoiceId, selectedSiteId])

  const paymentLinkMutation = useMutation({
    mutationFn: () =>
      customersApi.createPaymentLink(customerId, {
        amount: defaultPaymentAmount || outstanding,
        invoiceId: selectedInvoiceId || undefined,
        description: selectedSiteName
          ? `Portal payment request for ${selectedSiteName}`
          : selectedInvoiceId
            ? 'Portal payment request for invoice'
            : 'Portal payment request',
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
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Multi-site spend visibility, invoices, ledger, and payment actions
          </p>
        </div>
        {portalUrl && (
          <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost gap-1.5">
            <ExternalLink size={13} /> Open Zoho Portal
          </a>
        )}
      </div>

      <div
        className="rounded-2xl border px-4 py-3"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface-2)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>
              Active Billing Scope
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {siteContextLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border px-2.5 py-1" style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
              {siteBillingSummary.siteCount} site{siteBillingSummary.siteCount === 1 ? '' : 's'}
            </span>
            <span className="rounded-full border px-2.5 py-1" style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
              {siteBillingSummary.totalServices} active services
            </span>
            <span className="rounded-full border px-2.5 py-1" style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
              {siteBillingSummary.totalBandwidth} Mbps portfolio bandwidth
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            label: 'Outstanding',
            value: isLoading ? '--' : outstanding ? INR(outstanding) : 'INR 0',
            icon: CreditCard,
            accent: outstanding > 0 ? 'var(--status-degraded)' : 'var(--status-online)',
          },
          {
            label: 'Next Due Date',
            value: isLoading ? '--' : nextDueDate ? new Date(nextDueDate).toLocaleDateString('en-IN') : '--',
            icon: Calendar,
            accent: 'var(--brand)',
          },
          {
            label: 'Total Paid (YTD)',
            value: isLoading ? '--' : INR(totalPaidYtd),
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

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="card-title">Multi-Site Spend Summary</h3>
            <span
              className="text-[10px] font-mono px-2 py-1 rounded"
              style={{
                color: 'var(--status-info)',
                backgroundColor: 'color-mix(in srgb, var(--status-info) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--status-info) 25%, transparent)',
              }}
            >
              Site-scoped
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Recurring Spend', value: INR(siteBillingSummary.totalRecurring), icon: Building2 },
              { label: 'Estimated Outstanding', value: INR(siteBillingSummary.totalEstimatedOutstanding), icon: Wallet },
              { label: 'Sites in Scope', value: siteBillingSummary.siteCount, icon: Layers3 },
              { label: 'Portfolio Bandwidth', value: `${siteBillingSummary.totalBandwidth} Mbps`, icon: TrendingUp },
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
              Generate a secure payment link for an unpaid invoice or for the currently selected billing scope.
            </p>
          </div>

          <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>
            Select Invoice
            <select value={selectedInvoiceId} onChange={(event) => setSelectedInvoiceId(event.target.value)} className="input-field mt-1">
              <option value="">{selectedSiteId ? `${siteContextLabel} outstanding` : 'Outstanding balance'}</option>
              {invoices
                .filter((invoice) => (invoice.status ?? '').toUpperCase() !== 'PAID')
                .map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {(invoice.invoice_number ?? invoice.invoiceNumber ?? invoice.id.slice(-6))} | {INR(Number(invoice.total_amount ?? invoice.amount ?? 0))}
                  </option>
                ))}
            </select>
          </label>

          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Amount</p>
            <p className="mt-1 font-mono text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {INR(defaultPaymentAmount || outstanding)}
            </p>
            {selectedSiteId ? (
              <p className="mt-2 text-[11px]" style={{ color: 'var(--text-dim)' }}>
                Payment link will use the selected site context: {siteContextLabel}
              </p>
            ) : null}
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
          <div>
            <h3 className="card-title">Site Commercial Portfolio</h3>
            <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Recurring commercial footprint and estimated outstanding split by site.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
              <tr>
                <th className="table-th">Site</th>
                <th className="table-th">Services</th>
                <th className="table-th">Bandwidth</th>
                <th className="table-th">Recurring</th>
                <th className="table-th">Outstanding Share</th>
                <th className="table-th">Portfolio %</th>
              </tr>
            </thead>
            <tbody>
              {filteredSiteBilling.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    No site billing rows match the current customer scope.
                  </td>
                </tr>
              ) : (
                filteredSiteBilling.map((site) => (
                  <tr key={site.siteId} className="table-row">
                    <td className="table-td">
                      <div>
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{site.siteName}</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
                          {[site.city, site.state].filter(Boolean).join(', ') || 'No location'}
                        </p>
                      </div>
                    </td>
                    <td className="table-td font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                      {site.serviceCount}
                    </td>
                    <td className="table-td font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                      {site.totalBandwidthMbps} Mbps
                    </td>
                    <td className="table-td font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                      {INR(site.monthlyRecurringAmount)}
                    </td>
                    <td className="table-td font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                      {INR(site.estimatedOutstandingAmount)}
                    </td>
                    <td className="table-td">
                      <span
                        className="inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
                        style={{
                          color: 'var(--brand)',
                          backgroundColor: 'color-mix(in srgb, var(--brand) 12%, transparent)',
                          border: '1px solid color-mix(in srgb, var(--brand) 25%, transparent)',
                        }}
                      >
                        {site.portfolioSharePct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="card overflow-hidden">
          <div className="card-header">
            <div>
              <h3 className="card-title">Invoices</h3>
              <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Account-level invoices from Zoho Books. Site commercial split is shown separately above.
              </p>
            </div>
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
                  <th className="table-th w-32"></th>
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
                    const statusValue = (invoice.status ?? '').toUpperCase()
                    const color = STATUS_COLOR[statusValue] ?? 'var(--text-muted)'
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
                          {invoiceDate ? new Date(invoiceDate).toLocaleDateString('en-IN') : '--'}
                        </td>
                        <td className="table-td text-xs" style={{ color: 'var(--text-muted)' }}>
                          {dueDate ? new Date(dueDate).toLocaleDateString('en-IN') : '--'}
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
                            {statusValue.toLowerCase()}
                          </span>
                        </td>
                        <td className="table-td">
                          <div className="flex justify-end gap-2">
                            <Link to={`/portal/billing/${invoice.id}`} className="btn-ghost py-1 gap-1 text-[11px]">
                              Detail
                            </Link>
                            {pdfUrl ? (
                              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost py-1 gap-1 text-[11px]">
                                <Download size={11} /> PDF
                              </a>
                            ) : null}
                          </div>
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
                          {(payment.created_at ?? payment.updated_at) ? new Date(payment.created_at ?? payment.updated_at ?? '').toLocaleString('en-IN') : '--'}
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
                          ) : '--'}
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
