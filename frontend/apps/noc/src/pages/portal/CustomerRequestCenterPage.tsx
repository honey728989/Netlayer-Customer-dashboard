import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@netlayer/auth'
import { customersApi, sitesApi, type Service } from '@netlayer/api'
import { Card, EmptyState, ErrorState, KpiCard, PageHeader, StatusPill } from '@netlayer/ui'

type RequestType = 'BANDWIDTH_UPGRADE' | 'RELOCATION' | 'STATIC_IP' | 'SERVICE_SHIFT' | 'CONTRACT_RENEWAL' | 'GENERAL'

const requestTypeLabels: Record<RequestType, string> = {
  BANDWIDTH_UPGRADE: 'Bandwidth Upgrade',
  RELOCATION: 'Relocation',
  STATIC_IP: 'Static IP',
  SERVICE_SHIFT: 'Service Shift',
  CONTRACT_RENEWAL: 'Contract Renewal',
  GENERAL: 'General Request',
}

export function CustomerRequestCenterPage() {
  const { user } = useAuthStore()
  const customerId = user?.customerId ?? user?.organizationId ?? ''
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [form, setForm] = useState({
    requestType: 'BANDWIDTH_UPGRADE' as RequestType,
    priority: 'MEDIUM',
    title: '',
    description: '',
    serviceId: '',
    siteId: '',
    targetValue: '',
  })

  const { data: requests = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['customers', customerId, 'requests'],
    queryFn: () => customersApi.getRequests(customerId),
    enabled: Boolean(customerId),
    staleTime: 30_000,
  })

  const { data: sitesResponse } = useQuery({
    queryKey: ['sites', 'list', customerId, 'request-center'],
    queryFn: () => sitesApi.list({ customerId, pageSize: 100 }),
    enabled: Boolean(customerId),
    staleTime: 30_000,
  })

  const { data: services = [] } = useQuery({
    queryKey: ['customers', customerId, 'services', 'request-center'],
    queryFn: () => customersApi.getServices(customerId),
    enabled: Boolean(customerId),
    staleTime: 30_000,
  })

  const sites = useMemo(() => (Array.isArray(sitesResponse) ? sitesResponse : sitesResponse?.data ?? []), [sitesResponse])

  const requestStats = useMemo(() => {
    const open = requests.filter((item) => !['CLOSED', 'COMPLETED', 'REJECTED'].includes(String(item.status).toUpperCase())).length
    const high = requests.filter((item) => String(item.priority).toUpperCase() === 'HIGH').length
    const renewal = requests.filter((item) => item.requestType === 'CONTRACT_RENEWAL').length
    return { open, high, renewal, total: requests.length }
  }, [requests])

  const createRequestMutation = useMutation({
    mutationFn: () =>
      customersApi.createRequest(customerId, {
        requestType: form.requestType,
        priority: form.priority,
        title: form.title,
        description: form.description,
        serviceId: form.serviceId || undefined,
        siteId: form.siteId || undefined,
        targetValue: form.targetValue || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'requests'] })
      setFeedback({ type: 'success', message: 'Customer service request submitted successfully.' })
      setForm({
        requestType: 'BANDWIDTH_UPGRADE',
        priority: 'MEDIUM',
        title: '',
        description: '',
        serviceId: '',
        siteId: '',
        targetValue: '',
      })
    },
    onError: (error: any) => {
      setFeedback({ type: 'error', message: error?.response?.data?.message ?? 'Failed to submit request.' })
    },
  })

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <PageHeader
        title="Request Center"
        subtitle="Raise and track commercial and technical customer requests for upgrades, relocations, renewals, and service changes."
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
        <KpiCard label="Open Requests" value={requestStats.open} loading={isLoading} accentColor="var(--brand)" />
        <KpiCard label="High Priority" value={requestStats.high} loading={isLoading} accentColor="var(--status-degraded)" />
        <KpiCard label="Renewal Requests" value={requestStats.renewal} loading={isLoading} accentColor="var(--status-info)" />
        <KpiCard label="Total Logged" value={requestStats.total} loading={isLoading} accentColor="var(--status-online)" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
        <Card title="Raise New Request">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-[11px] text-muted">
              Request Type
              <select className="input-field mt-1" value={form.requestType} onChange={(event) => setForm((current) => ({ ...current, requestType: event.target.value as RequestType }))}>
                {Object.entries(requestTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="text-[11px] text-muted">
              Priority
              <select className="input-field mt-1" value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </label>
            <label className="text-[11px] text-muted">
              Site
              <select className="input-field mt-1" value={form.siteId} onChange={(event) => setForm((current) => ({ ...current, siteId: event.target.value }))}>
                <option value="">Not site-specific</option>
                {sites.map((site: any) => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </label>
            <label className="text-[11px] text-muted">
              Service
              <select className="input-field mt-1" value={form.serviceId} onChange={(event) => setForm((current) => ({ ...current, serviceId: event.target.value }))}>
                <option value="">Not service-specific</option>
                {(services as Service[]).map((service) => (
                  <option key={service.id} value={service.id}>{service.service_id ?? service.circuit_id ?? service.id}</option>
                ))}
              </select>
            </label>
            <label className="text-[11px] text-muted md:col-span-2">
              Title
              <input className="input-field mt-1" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="text-[11px] text-muted md:col-span-2">
              Target / Requested Outcome
              <input className="input-field mt-1" value={form.targetValue} onChange={(event) => setForm((current) => ({ ...current, targetValue: event.target.value }))} placeholder="Example: 500 Mbps, relocation before 30 Apr, additional static IP block" />
            </label>
            <label className="text-[11px] text-muted md:col-span-2">
              Description
              <textarea className="input-field mt-1 min-h-28" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
          </div>
          <button
            type="button"
            className="btn-primary mt-4"
            disabled={createRequestMutation.isPending || !form.title.trim() || !form.description.trim()}
            onClick={() => createRequestMutation.mutate()}
          >
            {createRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
          </button>
        </Card>

        <Card title="Request Types">
          <div className="space-y-3 text-[12px]">
            {Object.entries(requestTypeLabels).map(([value, label]) => (
              <div key={value} className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="font-semibold text-white">{label}</p>
                <p className="mt-1 text-muted">
                  {value === 'BANDWIDTH_UPGRADE' && 'Increase committed bandwidth or optimize service capacity on an active link.'}
                  {value === 'RELOCATION' && 'Move an existing service to a new office or branch address with planning support.'}
                  {value === 'STATIC_IP' && 'Request static IP allocation changes or expansion for hosted workloads.'}
                  {value === 'SERVICE_SHIFT' && 'Shift service ownership or operational mapping across branches or departments.'}
                  {value === 'CONTRACT_RENEWAL' && 'Start renewal or extension planning before contract expiry.'}
                  {value === 'GENERAL' && 'Submit any other commercial or delivery request needing customer success follow-up.'}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Request Register">
        {isError ? (
          <ErrorState message="Failed to load customer requests." onRetry={() => void refetch()} />
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton h-16 rounded-md" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <EmptyState title="No requests yet" description="Raised requests for upgrades, relocation, and renewals will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
                <tr>
                  <th className="table-th">Request</th>
                  <th className="table-th">Type</th>
                  <th className="table-th">Target</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Linked Scope</th>
                  <th className="table-th">Updated</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="table-row">
                    <td className="table-td">
                      <p className="text-xs font-semibold text-white">{request.title}</p>
                      <p className="mt-0.5 text-[10px] text-dim">{request.requestCode}</p>
                    </td>
                    <td className="table-td text-xs text-muted">{requestTypeLabels[request.requestType as RequestType] ?? request.requestType}</td>
                    <td className="table-td text-xs text-muted">{request.targetValue ?? '--'}</td>
                    <td className="table-td"><StatusPill status={request.status} /></td>
                    <td className="table-td text-xs text-muted">
                      {request.siteName ?? request.serviceName ?? 'Customer-wide'}
                    </td>
                    <td className="table-td text-xs text-muted">
                      {request.updatedAt ? new Date(request.updatedAt).toLocaleString('en-IN') : '--'}
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
