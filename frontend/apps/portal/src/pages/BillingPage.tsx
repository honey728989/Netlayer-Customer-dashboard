import { useState } from 'react'
import { Download, ExternalLink } from 'lucide-react'
import { useAuthStore } from '@netlayer/auth'
import { Card, PageLoader } from '@netlayer/ui'
import { useQuery } from '@tanstack/react-query'
import { customersApi } from '@netlayer/api'
import { queryKeys } from '@/services/queryClient'

interface Invoice {
  id: string
  invoiceNumber: string
  date: string
  dueDate: string
  amount: number
  status: 'paid' | 'unpaid' | 'overdue'
  pdfUrl: string
}

function InvoiceStatusBadge({ status }: { status: Invoice['status'] }) {
  const map = {
    paid: 'bg-status-online/10 text-status-online border-status-online/25',
    unpaid: 'bg-brand/10 text-brand border-brand/25',
    overdue: 'bg-status-offline/10 text-status-offline border-status-offline/25',
  }
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold capitalize ${map[status]}`}>
      {status}
    </span>
  )
}

export function BillingPage() {
  const { user } = useAuthStore()
  const { data: billing, isLoading } = useQuery({
    queryKey: queryKeys.customers.billing(user?.organizationId ?? ''),
    queryFn: () => customersApi.getBilling(user?.organizationId ?? ''),
    enabled: Boolean(user?.organizationId),
  })

  if (isLoading) return <PageLoader />

  const invoices: Invoice[] = billing?.invoices ?? []
  const summary = billing?.summary ?? { outstanding: 0, nextDueDate: '', totalPaidYtd: 0 }

  return (
    <div className="space-y-5 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-semibold text-white">Billing</h1>
          <p className="text-xs text-muted">Powered by Zoho Books</p>
        </div>
        <a
          href={billing?.portalUrl ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost"
        >
          <ExternalLink size={13} />
          Open Zoho Portal
        </a>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Outstanding Amount', value: `₹${(summary.outstanding / 100).toLocaleString('en-IN')}`, color: summary.outstanding > 0 ? '#ffb300' : '#00e676' },
          { label: 'Next Due Date', value: summary.nextDueDate ? new Date(summary.nextDueDate).toLocaleDateString('en-IN') : '—', color: '#00d4ff' },
          { label: 'Total Paid (YTD)', value: `₹${(summary.totalPaidYtd / 100).toLocaleString('en-IN')}`, color: '#00e676' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted">{label}</p>
            <p className="mt-1 font-mono text-xl font-medium" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Invoices */}
      <Card title="Invoices" noPadding>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              {['Invoice #', 'Date', 'Due Date', 'Amount', 'Status', ''].map((h) => (
                <th key={h} className="table-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-xs text-muted">No invoices found</td>
              </tr>
            )}
            {invoices.map((inv) => (
              <tr key={inv.id} className="table-row">
                <td className="table-td font-mono text-[11px] text-brand">{inv.invoiceNumber}</td>
                <td className="table-td text-xs text-muted">{new Date(inv.date).toLocaleDateString('en-IN')}</td>
                <td className="table-td text-xs text-muted">{new Date(inv.dueDate).toLocaleDateString('en-IN')}</td>
                <td className="table-td font-mono text-xs">₹{(inv.amount / 100).toLocaleString('en-IN')}</td>
                <td className="table-td"><InvoiceStatusBadge status={inv.status} /></td>
                <td className="table-td">
                  <a
                    href={inv.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost py-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download size={12} />
                    PDF
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
