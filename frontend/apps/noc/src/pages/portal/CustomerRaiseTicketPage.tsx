import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@netlayer/auth'
import { sitesApi, ticketsApi, type Site, type Ticket } from '@netlayer/api'
import { useCustomerPortalSiteFilterStore } from '@/store'
import { Card, PageHeader } from '@netlayer/ui'

type TicketPriority = Ticket['priority']

export function CustomerRaiseTicketPage() {
  const { user } = useAuthStore()
  const customerId = user?.customerId ?? user?.organizationId ?? ''
  const { selectedSiteId, setSelectedSite } = useCustomerPortalSiteFilterStore()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TicketPriority>('P3')
  const [siteId, setSiteId] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const { data: sitesResponse } = useQuery({
    queryKey: ['sites', 'list', customerId, 'ticket-form'],
    queryFn: () => sitesApi.list({ customerId, pageSize: 100 }),
    enabled: Boolean(customerId),
    staleTime: 60_000,
  })

  const sites = useMemo(() => (sitesResponse?.data ?? []) as Site[], [sitesResponse])
  const activeSite = useMemo(() => sites.find((site) => site.id === siteId) ?? null, [siteId, sites])

  useEffect(() => {
    const requestedSiteId = searchParams.get('siteId') ?? selectedSiteId ?? ''
    const requestedTitle = searchParams.get('title') ?? ''
    const requestedDescription = searchParams.get('description') ?? ''

    if (requestedSiteId) {
      setSiteId(requestedSiteId)
      const matchedSite = sites.find((site) => site.id === requestedSiteId)
      if (matchedSite) {
        setSelectedSite(matchedSite.id, matchedSite.name)
      }
    }

    if (requestedTitle) setTitle((current) => current || requestedTitle)
    if (requestedDescription) setDescription((current) => current || requestedDescription)
  }, [searchParams, selectedSiteId, setSelectedSite, sites])

  const createMutation = useMutation({
    mutationFn: () =>
      ticketsApi.create({
        title,
        description,
        priority,
        siteId: siteId || undefined,
        customerId,
        source: 'PORTAL',
      }),
    onSuccess: async () => {
      setMessage('Ticket created successfully.')
      setTitle('')
      setDescription('')
      setPriority('P3')
      setSiteId(selectedSiteId ?? '')
      await queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setMessage(null)
    createMutation.mutate()
  }

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <PageHeader
        title="Raise Support Ticket"
        subtitle="Log a service issue, attach it to a site, and start SLA tracking immediately"
      />

      {activeSite ? (
        <Card title="Selected Site Context">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            {[
              ['Site', activeSite.name],
              ['Status', activeSite.status],
              ['Location', [activeSite.city, activeSite.state].filter(Boolean).join(', ') || '—'],
              ['Bandwidth', `${activeSite.total_bandwidth_mbps ?? activeSite.bandwidth_mbps ?? activeSite.bandwidthMbps ?? '—'} Mbps`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p>
                <p className="mt-1 font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card title="Ticket Details">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-xs text-muted">
              Subject
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="input-field mt-1"
                placeholder="Link latency issue at Mumbai HQ"
                required
              />
            </label>
            <label className="text-xs text-muted">
              Priority
              <select value={priority} onChange={(event) => setPriority(event.target.value as TicketPriority)} className="input-field mt-1">
                <option value="P1">P1 - Critical</option>
                <option value="P2">P2 - High</option>
                <option value="P3">P3 - Medium</option>
                <option value="P4">P4 - Low</option>
              </select>
            </label>
          </div>

          <label className="block text-xs text-muted">
            Site
            <select
              value={siteId}
              onChange={(event) => {
                const nextSiteId = event.target.value
                setSiteId(nextSiteId)
                const nextSite = sites.find((site) => site.id === nextSiteId)
                setSelectedSite(nextSiteId || null, nextSite?.name ?? null)
              }}
              className="input-field mt-1"
            >
              <option value="">General / Not site specific</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs text-muted">
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="input-field mt-1 min-h-32"
              placeholder="Share full issue context, timestamps, impact, affected users, and any troubleshooting already attempted."
              required
            />
          </label>

          {message ? <p className="text-xs text-status-online">{message}</p> : null}
          {createMutation.isError ? <p className="text-xs text-status-offline">Unable to create ticket. Please try again.</p> : null}

          <div className="rounded-xl border p-3 text-xs" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface-2)', color: 'var(--text-muted)' }}>
            {priority === 'P1'
              ? 'P1 is for full outage or critical business impact. Use it only when service is fully unavailable.'
              : priority === 'P2'
                ? 'P2 is for major degradation impacting users or branches while service is partially available.'
                : priority === 'P3'
                  ? 'P3 is for standard service issues, intermittent problems, or degraded experience.'
                  : 'P4 is for low-priority requests, informational issues, or minor service questions.'}
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={createMutation.isPending || !customerId}>
              {createMutation.isPending ? 'Submitting...' : 'Create Ticket'}
            </button>
            <Link to="/portal/tickets" className="btn-ghost">
              Back to Tickets
            </Link>
          </div>
        </form>
      </Card>
    </div>
  )
}
