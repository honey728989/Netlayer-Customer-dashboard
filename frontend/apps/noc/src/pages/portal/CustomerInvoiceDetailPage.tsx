import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@netlayer/auth'
import { customersApi, type PaymentRecord } from '@netlayer/api'
import { Card, EmptyState, ErrorState, PageHeader } from '@netlayer/ui'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function CustomerInvoiceDetailPage() {
  const { invoiceId = '' } = useParams()
  const { user } = useAuthStore()
  const customerId = user?.customerId ?? user?.organizationId ?? ''

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['customers', customerId, 'invoice-detail', invoiceId],
    queryFn: () => customersApi.getInvoiceDetail(customerId, invoiceId),
    enabled: Boolean(customerId && invoiceId),
    staleTime: 60_000,
  })

  const invoice = data?.invoice
  const payments = (data?.payments ?? []) as PaymentRecord[]

  if (isError) {
    return (
      <div className="p-5">
        <ErrorState message="Failed to load invoice details." onRetry={() => void refetch()} />
      </div>
    )
  }

  if (!isLoading && !invoice) {
    return (
      <div className="p-5">
        <EmptyState title="Invoice not found" description="The selected invoice could not be found for this customer account." />
      </div>
    )
  }

  const lineItems = Array.isArray(invoice?.line_items) ? invoice.line_items : []
  const totalAmount = Number(invoice?.total_amount ?? invoice?.amount ?? 0)
  const balance = Number(invoice?.balance ?? 0)

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <PageHeader
        title={invoice?.invoice_number ?? invoice?.invoiceNumber ?? 'Invoice Detail'}
        subtitle="Invoice history, payment trail, and downloadable commercial document context."
      />

      <div className="flex flex-wrap gap-2">
        <Link to="/portal/billing" className="btn-ghost text-[11px]">Back to Billing</Link>
        {(invoice?.pdf_url ?? invoice?.pdfUrl) ? (
          <a href={invoice.pdf_url ?? invoice.pdfUrl ?? '#'} target="_blank" rel="noopener noreferrer" className="btn-primary text-[11px]">
            Open PDF
          </a>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card title="Invoice Summary">
          {isLoading || !invoice ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="skeleton h-10 rounded-md" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Invoice Date</p>
                <p className="mt-1 text-white">{invoice.invoice_date ?? invoice.date ? new Date(invoice.invoice_date ?? invoice.date ?? '').toLocaleDateString('en-IN') : '--'}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Due Date</p>
                <p className="mt-1 text-white">{invoice.due_date ?? invoice.dueDate ? new Date(invoice.due_date ?? invoice.dueDate ?? '').toLocaleDateString('en-IN') : '--'}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Invoice Amount</p>
                <p className="mt-1 font-mono text-white">{formatCurrency(totalAmount)}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Outstanding Balance</p>
                <p className="mt-1 font-mono text-white">{formatCurrency(balance)}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Status</p>
                <p className="mt-1 text-white">{invoice.status}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Payment Status</p>
                <p className="mt-1 text-white">{invoice.payment_status ?? 'Pending'}</p>
              </div>
            </div>
          )}
        </Card>

        <Card title="Customer Account">
          {isLoading || !data ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="skeleton h-10 rounded-md" />
              ))}
            </div>
          ) : (
            <div className="space-y-3 text-[12px]">
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Customer</p>
                <p className="mt-1 text-white">{data.customer.name}</p>
                <p className="mt-1 text-dim">{data.customer.code ?? '--'}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Zoho Customer</p>
                <p className="mt-1 font-mono text-white">{data.customer.zohoCustomerId ?? 'Not synced'}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Payment Follow-up</p>
                <p className="mt-1 text-dim">Use the Billing workspace to generate a fresh payment link if this invoice remains unpaid.</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card title="Line Items">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="skeleton h-12 rounded-md" />
            ))}
          </div>
        ) : lineItems.length === 0 ? (
          <EmptyState title="No detailed line items" description="This invoice does not currently expose line item details from the synced payload." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
                <tr>
                  <th className="table-th">Item</th>
                  <th className="table-th">Description</th>
                  <th className="table-th">Qty</th>
                  <th className="table-th">Rate</th>
                  <th className="table-th">Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={`${item.name ?? 'item'}-${index}`} className="table-row">
                    <td className="table-td text-xs text-white">{item.name ?? `Line Item ${index + 1}`}</td>
                    <td className="table-td text-xs text-muted">{item.description ?? '--'}</td>
                    <td className="table-td font-mono text-xs text-white">{item.quantity ?? 1}</td>
                    <td className="table-td font-mono text-xs text-white">{formatCurrency(Number(item.rate ?? 0))}</td>
                    <td className="table-td font-mono text-xs text-white">{formatCurrency(Number(item.item_total ?? item.rate ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Payment Trail">
        {payments.length === 0 ? (
          <EmptyState title="No payments linked" description="Customer payment activity for this invoice will appear here once payment links are used or receipts are synced." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
                <tr>
                  <th className="table-th">Created</th>
                  <th className="table-th">Method</th>
                  <th className="table-th">Amount</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Link</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="table-row">
                    <td className="table-td text-xs text-muted">
                      {(payment.created_at ?? payment.updated_at) ? new Date(payment.created_at ?? payment.updated_at ?? '').toLocaleString('en-IN') : '--'}
                    </td>
                    <td className="table-td text-xs text-white">{payment.payment_method ?? payment.paymentMethod ?? 'Portal'}</td>
                    <td className="table-td font-mono text-xs text-white">{formatCurrency(Number(payment.amount ?? 0))}</td>
                    <td className="table-td text-xs text-white">{payment.status}</td>
                    <td className="table-td text-xs">
                      {(payment.payment_link ?? payment.paymentLink) ? (
                        <a href={payment.payment_link ?? payment.paymentLink ?? '#'} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                          Open
                        </a>
                      ) : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
