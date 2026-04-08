import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@netlayer/auth'
import { feasibilityApi, sitesApi, type FeasibilityComment, type FeasibilityRequest, type Site } from '@netlayer/api'
import { Card, EmptyState, ErrorState, KpiCard, PageHeader, StatusPill } from '@netlayer/ui'
import { useCustomerPortalSiteFilterStore } from '@/store'

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

function timelineLabel(status: string) {
  switch (status.toUpperCase()) {
    case 'REQUESTED':
      return 'Request raised'
    case 'UNDER_REVIEW':
      return 'Engineering review'
    case 'SURVEY_SCHEDULED':
      return 'Survey planned'
    case 'FEASIBLE':
      return 'Feasible'
    case 'PARTIALLY_FEASIBLE':
      return 'Partial feasibility'
    case 'QUOTATION_SHARED':
      return 'Commercial shared'
    case 'CONVERTED':
      return 'Converted to delivery'
    case 'NOT_FEASIBLE':
      return 'Not feasible'
    default:
      return status
  }
}

export function CustomerFeasibilityPage() {
  const { user } = useAuthStore()
  const customerId = user?.customerId ?? user?.organizationId ?? ''
  const queryClient = useQueryClient()
  const { selectedSiteId } = useCustomerPortalSiteFilterStore()
  const [form, setForm] = useState<FeasibilityForm>(INITIAL_FORM)
  const [message, setMessage] = useState<string | null>(null)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [commentBody, setCommentBody] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['feasibility', 'customer', customerId],
    queryFn: () => feasibilityApi.list({ customerId }),
    enabled: Boolean(customerId),
    staleTime: 30_000,
  })

  const { data: sitesResponse } = useQuery({
    queryKey: ['sites', 'customer-feasibility'],
    queryFn: () => sitesApi.list(),
    staleTime: 60_000,
  })

  const requests = data ?? []
  const customerSites = (sitesResponse?.data ?? []) as Site[]

  useEffect(() => {
    if (!selectedRequestId && requests.length > 0) {
      setSelectedRequestId(requests[0].id)
    }
  }, [requests, selectedRequestId])

  useEffect(() => {
    if (!selectedSiteId) return
    const site = customerSites.find((item) => item.id === selectedSiteId)
    if (!site) return

    setForm((current) => ({
      ...current,
      city: current.city || site.city || '',
      state: current.state || site.state || '',
      address: current.address || site.address || '',
      siteName: current.siteName || `${site.name} Expansion`,
    }))
  }, [customerSites, selectedSiteId])

  const selectedRequest = useMemo(
    () => requests.find((request: FeasibilityRequest) => request.id === selectedRequestId) ?? null,
    [requests, selectedRequestId],
  )

  const { data: selectedRequestDetails } = useQuery({
    queryKey: ['feasibility', selectedRequestId, 'detail'],
    queryFn: () => feasibilityApi.getById(selectedRequestId!),
    enabled: Boolean(selectedRequestId),
    staleTime: 30_000,
  })

  const { data: comments = [] } = useQuery({
    queryKey: ['feasibility', selectedRequestId, 'comments'],
    queryFn: () => feasibilityApi.getComments(selectedRequestId!),
    enabled: Boolean(selectedRequestId),
    staleTime: 15_000,
  })

  const currentRequest = selectedRequestDetails ?? selectedRequest

  const stats = useMemo(() => {
    return {
      open: requests.filter((request: FeasibilityRequest) => !['CONVERTED', 'CLOSED', 'NOT_FEASIBLE'].includes(request.status)).length,
      feasible: requests.filter((request: FeasibilityRequest) => request.status === 'FEASIBLE').length,
      survey: requests.filter((request: FeasibilityRequest) => request.status === 'SURVEY_SCHEDULED').length,
      total: requests.length,
    }
  }, [requests])

  const nearbySites = useMemo(() => {
    const normalizedCity = form.city.trim().toLowerCase()
    const normalizedState = form.state.trim().toLowerCase()

    return customerSites.filter((site) => {
      if (selectedSiteId && site.id === selectedSiteId) return true
      if (normalizedCity && site.city?.toLowerCase() === normalizedCity) return true
      if (!normalizedCity && normalizedState && site.state?.toLowerCase() === normalizedState) return true
      return false
    })
  }, [customerSites, form.city, form.state, selectedSiteId])

  const coverageSummary = useMemo(() => {
    const sameCityCount = customerSites.filter((site) => site.city && site.city === form.city).length
    const sameStateCount = customerSites.filter((site) => site.state && site.state === form.state).length
    const activeServices = nearbySites.reduce((sum, site) => sum + Number(site.service_count ?? 0), 0)

    return {
      sameCityCount,
      sameStateCount,
      activeServices,
    }
  }, [customerSites, form.city, form.state, nearbySites])

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
    onSuccess: async (createdRequest) => {
      setMessage('Feasibility request submitted successfully.')
      setForm(INITIAL_FORM)
      setSelectedRequestId(createdRequest.id)
      await queryClient.invalidateQueries({ queryKey: ['feasibility', 'customer', customerId] })
      await queryClient.invalidateQueries({ queryKey: ['feasibility', createdRequest.id, 'detail'] })
    },
  })

  const commentMutation = useMutation({
    mutationFn: (body: string) => feasibilityApi.addComment(selectedRequestId!, body),
    onSuccess: async () => {
      setCommentBody('')
      await queryClient.invalidateQueries({ queryKey: ['feasibility', selectedRequestId, 'comments'] })
      await queryClient.invalidateQueries({ queryKey: ['feasibility', selectedRequestId, 'detail'] })
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

  const handleCommentSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!selectedRequestId || !commentBody.trim()) return
    commentMutation.mutate(commentBody.trim())
  }

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <PageHeader
        title="Feasibility Requests"
        subtitle="Plan new site expansion, compare against existing coverage, and track survey-to-quotation progress."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="Open Requests" value={stats.open} loading={isLoading} accentColor="var(--brand)" />
        <KpiCard label="Survey Scheduled" value={stats.survey} loading={isLoading} accentColor="var(--status-degraded)" />
        <KpiCard label="Feasible" value={stats.feasible} loading={isLoading} accentColor="var(--status-online)" />
        <KpiCard label="Total Raised" value={stats.total} loading={isLoading} accentColor="var(--status-info)" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_0.95fr]">
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

            {nearbySites.length > 0 ? (
              <div className="rounded-lg border border-border bg-surface-2 p-3 text-[11px]">
                <p className="font-semibold text-white">Expansion Context</p>
                <p className="mt-1 text-muted">
                  {coverageSummary.sameCityCount > 0
                    ? `${coverageSummary.sameCityCount} existing site(s) already operate in ${form.city || 'this city'}.`
                    : coverageSummary.sameStateCount > 0
                      ? `${coverageSummary.sameStateCount} site(s) already operate in ${form.state || 'this state'}.`
                      : 'No existing nearby sites found yet. This may require fresh access planning.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {nearbySites.slice(0, 4).map((site) => (
                    <button
                      key={site.id}
                      type="button"
                      className="rounded-full border border-border px-2.5 py-1 text-[10px] text-dim transition hover:border-brand hover:text-white"
                      onClick={() => {
                        handleChange('city', site.city ?? '')
                        handleChange('state', site.state ?? '')
                        handleChange('address', site.address ?? '')
                        handleChange('siteName', `${site.name} Expansion`)
                      }}
                    >
                      {site.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

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
                placeholder="Building access notes, preferred timings, nearest branch context, existing provider details..."
              />
            </label>

            <div className="rounded-lg border border-border bg-surface-2 p-3 text-[11px] text-muted">
              <p className="font-semibold text-white">Coverage Snapshot</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div>
                  <p className="text-dim">Same city</p>
                  <p className="mt-1 font-mono text-white">{coverageSummary.sameCityCount}</p>
                </div>
                <div>
                  <p className="text-dim">Same state</p>
                  <p className="mt-1 font-mono text-white">{coverageSummary.sameStateCount}</p>
                </div>
                <div>
                  <p className="text-dim">Nearby services</p>
                  <p className="mt-1 font-mono text-white">{coverageSummary.activeServices}</p>
                </div>
              </div>
            </div>

            {message ? <p className="text-xs text-status-online">{message}</p> : null}
            {createMutation.isError ? (
              <p className="text-xs text-status-offline">Unable to create feasibility request. Please try again.</p>
            ) : null}

            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </Card>

        <Card title="Expansion Tracker">
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
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-3">
                {requests.map((request: FeasibilityRequest) => (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => setSelectedRequestId(request.id)}
                    className="w-full rounded-lg border border-border bg-surface-2 p-4 text-left transition hover:border-brand"
                    style={selectedRequestId === request.id ? { borderColor: 'var(--brand)' } : undefined}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{request.site_name ?? request.siteName ?? request.company_name ?? 'Requested site'}</p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {[request.city, request.state].filter(Boolean).join(', ') || request.address || 'Location pending'}
                        </p>
                      </div>
                      <StatusPill status={request.status} />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] xl:grid-cols-2">
                      <div className="rounded-md bg-surface px-2 py-1.5">
                        <p className="text-dim">Service</p>
                        <p className="mt-0.5 font-mono text-white">{request.service_type ?? '—'}</p>
                      </div>
                      <div className="rounded-md bg-surface px-2 py-1.5">
                        <p className="text-dim">Bandwidth</p>
                        <p className="mt-0.5 font-mono text-white">{request.bandwidth_mbps ?? 0} Mbps</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="rounded-lg border border-border bg-surface-2 p-4">
                {currentRequest ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {currentRequest.site_name ?? currentRequest.siteName ?? 'Selected request'}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {currentRequest.request_code ?? currentRequest.id.slice(-8)} • {timelineLabel(currentRequest.status)}
                        </p>
                      </div>
                      <StatusPill status={currentRequest.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-md bg-surface px-3 py-2">
                        <p className="text-dim">Survey</p>
                        <p className="mt-1 font-mono text-white">{currentRequest.survey_scheduled_for ?? currentRequest.survey_date ?? 'Pending'}</p>
                      </div>
                      <div className="rounded-md bg-surface px-3 py-2">
                        <p className="text-dim">Engineer</p>
                        <p className="mt-1 font-mono text-white">{currentRequest.assigned_engineer_name ?? 'To be assigned'}</p>
                      </div>
                      <div className="rounded-md bg-surface px-3 py-2">
                        <p className="text-dim">Est. MRC</p>
                        <p className="mt-1 font-mono text-white">{currentRequest.estimated_mrc ? `INR ${currentRequest.estimated_mrc}` : 'TBD'}</p>
                      </div>
                      <div className="rounded-md bg-surface px-3 py-2">
                        <p className="text-dim">Est. CAPEX</p>
                        <p className="mt-1 font-mono text-white">{currentRequest.estimated_capex ? `INR ${currentRequest.estimated_capex}` : 'TBD'}</p>
                      </div>
                    </div>

                    {currentRequest.feasibility_summary || currentRequest.result_notes || currentRequest.survey_notes ? (
                      <div className="rounded-lg border border-border bg-surface p-3 text-[11px] text-muted">
                        <p className="font-semibold text-white">Engineering Notes</p>
                        <p className="mt-2">
                          {currentRequest.feasibility_summary ?? currentRequest.result_notes ?? currentRequest.survey_notes}
                        </p>
                      </div>
                    ) : null}

                    <div className="rounded-lg border border-border bg-surface p-3 text-[11px]">
                      <p className="font-semibold text-white">Progress Timeline</p>
                      <div className="mt-3 space-y-2">
                        {['REQUESTED', 'UNDER_REVIEW', 'SURVEY_SCHEDULED', 'FEASIBLE', 'QUOTATION_SHARED', 'CONVERTED'].map((step) => {
                          const active = currentRequest.status === step
                          const reached = ['REQUESTED', 'UNDER_REVIEW', 'SURVEY_SCHEDULED', 'FEASIBLE', 'QUOTATION_SHARED', 'CONVERTED'].indexOf(currentRequest.status) >= ['REQUESTED', 'UNDER_REVIEW', 'SURVEY_SCHEDULED', 'FEASIBLE', 'QUOTATION_SHARED', 'CONVERTED'].indexOf(step)
                          return (
                            <div key={step} className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: active ? 'var(--brand)' : reached ? 'var(--status-online)' : 'var(--border)' }}
                              />
                              <span style={{ color: reached ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                {timelineLabel(step)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-surface p-3 text-[11px]">
                      <p className="font-semibold text-white">Conversation</p>
                      <div className="mt-3 space-y-2">
                        {(comments as FeasibilityComment[]).length === 0 ? (
                          <p className="text-muted">No comments yet.</p>
                        ) : (
                          (comments as FeasibilityComment[]).map((comment) => (
                            <div key={comment.id} className="rounded-md border border-border px-3 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-white">{comment.author_name ?? 'Netlayer'}</span>
                                <span className="text-dim">{comment.created_at ? new Date(comment.created_at).toLocaleString('en-IN') : ''}</span>
                              </div>
                              <p className="mt-1 text-muted">{comment.body}</p>
                            </div>
                          ))
                        )}
                      </div>

                      <form className="mt-3 space-y-2" onSubmit={handleCommentSubmit}>
                        <textarea
                          value={commentBody}
                          onChange={(event) => setCommentBody(event.target.value)}
                          className="input-field min-h-20"
                          placeholder="Add a note or ask for an update..."
                        />
                        <button type="submit" className="btn-ghost" disabled={commentMutation.isPending || !commentBody.trim()}>
                          {commentMutation.isPending ? 'Posting...' : 'Post Comment'}
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <EmptyState title="Select a request" description="Choose a feasibility request to inspect timeline, engineering notes, and comments." />
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
