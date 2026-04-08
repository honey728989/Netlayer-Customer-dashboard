import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@netlayer/auth'
import { feasibilityApi, type FeasibilityRequest } from '@netlayer/api'
import { Card, EmptyState, ErrorState, KpiCard, PageHeader, StatusPill } from '@netlayer/ui'

type FeasibilityForm = {
  siteName: string
  address: string
  city: string
  state: string
  contactName: string
  contactEmail: string
  contactPhone: string
  serviceType: string
  bandwidthRequiredMbps: string
  redundancyRequired: boolean
  expectedGoLiveDate: string
  surveyNotes: string
}

const INITIAL_FORM: FeasibilityForm = {
  siteName: '',
  address: '',
  city: '',
  state: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  serviceType: 'ILL',
  bandwidthRequiredMbps: '100',
  redundancyRequired: false,
  expectedGoLiveDate: '',
  surveyNotes: '',
}

function statusTone(status: string) {
  const normalized = status.toUpperCase()
  if (normalized === 'FEASIBLE' || normalized === 'CONVERTED') return 'var(--status-online)'
  if (normalized === 'NOT_FEASIBLE') return 'var(--status-offline)'
  if (normalized === 'PARTIALLY_FEASIBLE' || normalized === 'UNDER_REVIEW' || normalized === 'SURVEY_SCHEDULED') return 'var(--status-degraded)'
  return 'var(--brand)'
}

export function CustomerFeasibilityPage() {
  const { user } = useAuthStore()
  const customerId = user?.customerId ?? user?.organizationId ?? ''
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FeasibilityForm>(INITIAL_FORM)
  const [message, setMessage] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['feasibility', 'customer', customerId],
    queryFn: () => feasibilityApi.list({ customerId }),
    enabled: Boolean(customerId),
    staleTime: 30_000,
  })

  const requests = data ?? []

  const stats = useMemo(() => {
    return {
      open: requests.filter((request: FeasibilityRequest) => !['CONVERTED', 'CLOSED', 'NOT_FEASIBLE'].includes(request.status)).length,
      feasible: requests.filter((request: FeasibilityRequest) => request.status === 'FEASIBLE').length,
      survey: requests.filter((request: FeasibilityRequest) => request.status === 'SURVEY_SCHEDULED').length,
      total: requests.length,
    }
  }, [requests])

  const createMutation = useMutation({
    mutationFn: (payload: FeasibilityForm) =>
      feasibilityApi.create({
        siteName: payload.siteName,
        address: payload.address,
        city: payload.city,
        state: payload.state,
        contactName: payload.contactName,
        contactEmail: payload.contactEmail || undefined,
        contactPhone: payload.contactPhone || undefined,
        serviceType: payload.serviceType,
        bandwidthRequiredMbps: Number(payload.bandwidthRequiredMbps),
        redundancyRequired: payload.redundancyRequired,
        expectedGoLiveDate: payload.expectedGoLiveDate || undefined,
        surveyNotes: payload.surveyNotes || undefined,
        source: 'CUSTOMER_PORTAL',
      }),
    onSuccess: async () => {
      setMessage('Feasibility request submitted successfully.')
      setForm(INITIAL_FORM)
      await queryClient.invalidateQueries({ queryKey: ['feasibility', 'customer', customerId] })
    },
  })

  const handleChange = <K extends keyof FeasibilityForm>(key: K, value: FeasibilityForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setMessage(null)
    createMutation.mutate(form)
  }

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <PageHeader
        title="Feasibility Requests"
        subtitle="Raise new site feasibility checks and track survey progress from the customer portal"
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="Open Requests" value={stats.open} loading={isLoading} accentColor="var(--brand)" />
        <KpiCard label="Survey Scheduled" value={stats.survey} loading={isLoading} accentColor="var(--status-degraded)" />
        <KpiCard label="Feasible" value={stats.feasible} loading={isLoading} accentColor="var(--status-online)" />
        <KpiCard label="Total Raised" value={stats.total} loading={isLoading} accentColor="var(--status-info)" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_1.4fr]">
        <Card title="Raise New Feasibility">
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs text-muted">
                Site name
                <input
                  value={form.siteName}
                  onChange={(event) => handleChange('siteName', event.target.value)}
                  className="input-field mt-1"
                  required
                />
              </label>
              <label className="text-xs text-muted">
                Service type
                <select
                  value={form.serviceType}
                  onChange={(event) => handleChange('serviceType', event.target.value)}
                  className="input-field mt-1"
                >
                  <option value="ILL">ILL</option>
                  <option value="Business Broadband">Business Broadband</option>
                  <option value="MPLS">MPLS</option>
                  <option value="Managed Link">Managed Link</option>
                </select>
              </label>
            </div>

            <label className="block text-xs text-muted">
              Full address
              <textarea
                value={form.address}
                onChange={(event) => handleChange('address', event.target.value)}
                className="input-field mt-1 min-h-24"
                required
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="text-xs text-muted">
                City
                <input value={form.city} onChange={(event) => handleChange('city', event.target.value)} className="input-field mt-1" required />
              </label>
              <label className="text-xs text-muted">
                State
                <input value={form.state} onChange={(event) => handleChange('state', event.target.value)} className="input-field mt-1" required />
              </label>
              <label className="text-xs text-muted">
                Bandwidth (Mbps)
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={form.bandwidthRequiredMbps}
                  onChange={(event) => handleChange('bandwidthRequiredMbps', event.target.value)}
                  className="input-field mt-1"
                  required
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs text-muted">
                Contact person
                <input value={form.contactName} onChange={(event) => handleChange('contactName', event.target.value)} className="input-field mt-1" required />
              </label>
              <label className="text-xs text-muted">
                Contact email
                <input type="email" value={form.contactEmail} onChange={(event) => handleChange('contactEmail', event.target.value)} className="input-field mt-1" />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs text-muted">
                Contact phone
                <input value={form.contactPhone} onChange={(event) => handleChange('contactPhone', event.target.value)} className="input-field mt-1" />
              </label>
              <label className="text-xs text-muted">
                Expected go-live date
                <input type="date" value={form.expectedGoLiveDate} onChange={(event) => handleChange('expectedGoLiveDate', event.target.value)} className="input-field mt-1" />
              </label>
            </div>

            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={form.redundancyRequired}
                onChange={(event) => handleChange('redundancyRequired', event.target.checked)}
              />
              Redundancy required
            </label>

            <label className="block text-xs text-muted">
              Notes for survey team
              <textarea
                value={form.surveyNotes}
                onChange={(event) => handleChange('surveyNotes', event.target.value)}
                className="input-field mt-1 min-h-20"
                placeholder="Building access notes, preferred timings, existing provider details..."
              />
            </label>

            {message ? <p className="text-xs text-status-online">{message}</p> : null}
            {createMutation.isError ? (
              <p className="text-xs text-status-offline">Unable to create feasibility request. Please try again.</p>
            ) : null}

            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </Card>

        <Card title="Request Tracker">
          {isError ? (
            <ErrorState message="Failed to load feasibility requests." onRetry={() => void refetch()} />
          ) : isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="skeleton h-20 rounded-md" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              title="No feasibility requests yet"
              description="Raise your first request to start survey, feasibility, and quotation planning for a new site."
            />
          ) : (
            <div className="space-y-3">
              {requests.map((request: FeasibilityRequest) => {
                const tone = statusTone(request.status)
                return (
                  <div key={request.id} className="rounded-lg border border-border bg-surface-2 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{request.site_name ?? request.siteName ?? request.company_name ?? 'Requested site'}</p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {[request.city, request.state].filter(Boolean).join(', ') || request.address || 'Location pending'}
                        </p>
                      </div>
                      <StatusPill status={request.status} />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] xl:grid-cols-4">
                      <div className="rounded-md bg-surface px-2 py-1.5">
                        <p className="text-dim">Service</p>
                        <p className="mt-0.5 font-mono text-white">{request.service_type ?? '—'}</p>
                      </div>
                      <div className="rounded-md bg-surface px-2 py-1.5">
                        <p className="text-dim">Bandwidth</p>
                        <p className="mt-0.5 font-mono text-white">{request.bandwidth_mbps ?? 0} Mbps</p>
                      </div>
                      <div className="rounded-md bg-surface px-2 py-1.5">
                        <p className="text-dim">Survey</p>
                        <p className="mt-0.5 font-mono text-white">{request.survey_date ?? 'Pending'}</p>
                      </div>
                      <div className="rounded-md bg-surface px-2 py-1.5">
                        <p className="text-dim">Est. MRC</p>
                        <p className="mt-0.5 font-mono text-white">{request.estimated_mrc ? `INR ${request.estimated_mrc}` : 'TBD'}</p>
                      </div>
                    </div>

                    {request.result_notes || request.notes ? (
                      <div className="mt-3 rounded-md border px-3 py-2 text-[11px]" style={{ borderColor: tone, color: 'var(--text-muted)' }}>
                        {request.result_notes ?? request.notes}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
