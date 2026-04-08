import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@netlayer/auth'
import { customersApi, sitesApi, type CustomerDocumentPayload } from '@netlayer/api'
import { Card, EmptyState, ErrorState, KpiCard, PageHeader } from '@netlayer/ui'

const categoryLabels: Record<string, string> = {
  CONTRACT: 'Contract',
  KYC: 'KYC',
  BILLING: 'Billing',
  IMPLEMENTATION: 'Implementation',
  REPORT: 'Report',
  COMPLIANCE: 'Compliance',
  OTHER: 'Other',
}

export function CustomerDocumentsPage() {
  const { user } = useAuthStore()
  const customerId = user?.customerId ?? user?.organizationId ?? ''
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [form, setForm] = useState<CustomerDocumentPayload>({
    title: '',
    category: 'CONTRACT',
    fileUrl: '',
    notes: '',
    linkedSiteId: '',
    status: 'ACTIVE',
  })

  const { data: documents = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['customers', customerId, 'documents'],
    queryFn: () => customersApi.getDocuments(customerId),
    enabled: Boolean(customerId),
    staleTime: 30_000,
  })

  const { data: sitesResponse } = useQuery({
    queryKey: ['sites', 'list', customerId, 'documents'],
    queryFn: () => sitesApi.list({ customerId, pageSize: 100 }),
    enabled: Boolean(customerId),
    staleTime: 30_000,
  })

  const sites = Array.isArray(sitesResponse) ? sitesResponse : sitesResponse?.data ?? []

  const createDocumentMutation = useMutation({
    mutationFn: () => customersApi.createDocument(customerId, form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'documents'] })
      await queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'audit-logs'] })
      setFeedback({ type: 'success', message: 'Customer document registered successfully.' })
      setForm({
        title: '',
        category: 'CONTRACT',
        fileUrl: '',
        notes: '',
        linkedSiteId: '',
        status: 'ACTIVE',
      })
    },
    onError: (error: any) => {
      setFeedback({ type: 'error', message: error?.response?.data?.message ?? 'Failed to create document.' })
    },
  })

  const stats = {
    total: documents.length,
    contracts: documents.filter((item) => item.category === 'CONTRACT').length,
    reports: documents.filter((item) => item.category === 'REPORT').length,
    compliance: documents.filter((item) => item.category === 'COMPLIANCE' || item.category === 'KYC').length,
  }

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <PageHeader
        title="Documents"
        subtitle="Centralize contracts, KYC, billing, implementation, and compliance references for your customer account."
      />

      {feedback ? (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: feedback.type === 'success' ? 'color-mix(in srgb, var(--status-online) 35%, transparent)' : 'color-mix(in srgb, var(--status-offline) 35%, transparent)',
            backgroundColor: feedback.type === 'success' ? 'color-mix(in srgb, var(--status-online) 10%, transparent)' : 'color-mix(in srgb, var(--status-offline) 10%, transparent)',
            color: feedback.type === 'success' ? 'var(--status-online)' : 'var(--status-offline)',
          }}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="Total Documents" value={stats.total} loading={isLoading} accentColor="var(--brand)" />
        <KpiCard label="Contracts" value={stats.contracts} loading={isLoading} accentColor="var(--status-online)" />
        <KpiCard label="Reports" value={stats.reports} loading={isLoading} accentColor="var(--status-info)" />
        <KpiCard label="Compliance / KYC" value={stats.compliance} loading={isLoading} accentColor="var(--status-degraded)" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
        <Card title="Register New Document">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-[11px] text-muted">
              Title
              <input className="input-field mt-1" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="text-[11px] text-muted">
              Category
              <select className="input-field mt-1" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as CustomerDocumentPayload['category'] }))}>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="text-[11px] text-muted">
              Linked Site
              <select className="input-field mt-1" value={form.linkedSiteId ?? ''} onChange={(event) => setForm((current) => ({ ...current, linkedSiteId: event.target.value }))}>
                <option value="">Customer-wide document</option>
                {sites.map((site: any) => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </label>
            <label className="text-[11px] text-muted">
              Status
              <select className="input-field mt-1" value={form.status ?? 'ACTIVE'} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
                <option value="PENDING">Pending</option>
              </select>
            </label>
            <label className="text-[11px] text-muted md:col-span-2">
              Document URL
              <input className="input-field mt-1" value={form.fileUrl ?? ''} onChange={(event) => setForm((current) => ({ ...current, fileUrl: event.target.value }))} placeholder="https://..." />
            </label>
            <label className="text-[11px] text-muted md:col-span-2">
              Notes
              <textarea className="input-field mt-1 min-h-24" value={form.notes ?? ''} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            </label>
          </div>
          <button
            type="button"
            className="btn-primary mt-4"
            disabled={createDocumentMutation.isPending || !form.title.trim() || !form.category}
            onClick={() => createDocumentMutation.mutate()}
          >
            {createDocumentMutation.isPending ? 'Saving...' : 'Add Document'}
          </button>
        </Card>

        <Card title="Document Categories">
          <div className="space-y-3 text-[12px]">
            {Object.entries(categoryLabels).map(([value, label]) => (
              <div key={value} className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="font-semibold text-white">{label}</p>
                <p className="mt-1 text-muted">
                  {value === 'CONTRACT' && 'MSA, order forms, renewals, and signed commercial documents.'}
                  {value === 'KYC' && 'Company proofs, identity documents, and onboarding approvals.'}
                  {value === 'BILLING' && 'Invoice references, payment receipts, and finance approvals.'}
                  {value === 'IMPLEMENTATION' && 'Handover notes, as-built documentation, and installation records.'}
                  {value === 'REPORT' && 'Monthly SLA reports, uptime summaries, and operational exports.'}
                  {value === 'COMPLIANCE' && 'Audits, policy acknowledgements, and regulatory artifacts.'}
                  {value === 'OTHER' && 'Any other customer-facing operational or commercial document.'}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Document Register">
        {isError ? (
          <ErrorState message="Failed to load customer documents." onRetry={() => void refetch()} />
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton h-14 rounded-md" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <EmptyState title="No documents yet" description="Customer contracts, reports, and implementation records will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
                <tr>
                  <th className="table-th">Title</th>
                  <th className="table-th">Category</th>
                  <th className="table-th">Linked Site</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Updated</th>
                  <th className="table-th">Open</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id} className="table-row">
                    <td className="table-td">
                      <p className="text-xs font-semibold text-white">{document.title}</p>
                      <p className="mt-0.5 text-[10px] text-dim">{document.notes ?? 'Customer document record'}</p>
                    </td>
                    <td className="table-td text-xs text-muted">{categoryLabels[document.category] ?? document.category}</td>
                    <td className="table-td text-xs text-muted">{document.linkedSiteName ?? 'Customer-wide'}</td>
                    <td className="table-td text-xs text-white">{document.status}</td>
                    <td className="table-td text-xs text-muted">{document.updatedAt ? new Date(document.updatedAt).toLocaleString('en-IN') : '--'}</td>
                    <td className="table-td text-xs">
                      {document.fileUrl ? (
                        <a href={document.fileUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
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
