import { Link, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@netlayer/auth'
import { customersApi } from '@netlayer/api'
import { Card, EmptyState, ErrorState, PageHeader, StatusPill } from '@netlayer/ui'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function CustomerServiceDetailPage() {
  const { serviceId = '' } = useParams()
  const { user } = useAuthStore()
  const customerId = user?.customerId ?? user?.organizationId ?? ''

  const { data: services = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['customers', customerId, 'services'],
    queryFn: () => customersApi.getServices(customerId),
    enabled: Boolean(customerId),
    staleTime: 60_000,
  })

  const service = useMemo(
    () => services.find((item) => item.id === serviceId || item.service_id === serviceId || item.circuit_id === serviceId),
    [serviceId, services],
  )

  if (isError) {
    return (
      <div className="p-5">
        <ErrorState message="Failed to load service details." onRetry={() => void refetch()} />
      </div>
    )
  }

  if (!isLoading && !service) {
    return (
      <div className="p-5">
        <EmptyState
          title="Service not found"
          description="The selected service could not be found in your current customer scope."
        />
      </div>
    )
  }

  const monthlyCharge = Number(service?.monthly_charge ?? 0)

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <PageHeader
        title={service?.service_id ?? service?.circuit_id ?? 'Service Detail'}
        subtitle="Circuit metadata, commercial context, and operational service snapshot."
      />

      <div className="flex flex-wrap gap-2">
        <Link to="/portal/services" className="btn-ghost text-[11px]">Back to Services</Link>
        {service?.site_id ? (
          <Link to={`/portal/sites/${service.site_id}`} className="btn-ghost text-[11px]">Open Site</Link>
        ) : null}
        <Link to="/portal/tickets/new" className="btn-primary text-[11px]">Raise Service Ticket</Link>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card title="Service Snapshot">
          {isLoading || !service ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="skeleton h-10 rounded-md" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Service ID</p>
                <p className="mt-1 font-mono text-sm text-white">{service.service_id ?? service.id}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Circuit ID</p>
                <p className="mt-1 font-mono text-sm text-white">{service.circuit_id ?? '--'}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Service Type</p>
                <p className="mt-1 text-sm text-white">{service.service_type ?? '--'}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Status</p>
                <div className="mt-1"><StatusPill status={service.status ?? 'UNKNOWN'} /></div>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Bandwidth</p>
                <p className="mt-1 font-mono text-sm text-white">{service.bandwidth_mbps ?? 0} Mbps</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Monthly Charge</p>
                <p className="mt-1 font-mono text-sm text-white">{formatCurrency(monthlyCharge)}</p>
              </div>
            </div>
          )}
        </Card>

        <Card title="Routing & Contract">
          {isLoading || !service ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="skeleton h-10 rounded-md" />
              ))}
            </div>
          ) : (
            <div className="space-y-3 text-[12px]">
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Site</p>
                <p className="mt-1 text-white">{service.site_name ?? '--'}</p>
                <p className="mt-1 text-dim">{[service.city, service.state].filter(Boolean).join(', ') || 'Location pending'}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">POP / Last Mile</p>
                <p className="mt-1 text-white">
                  {[service.pop, service.last_mile].filter(Boolean).join(' / ') || 'Routing partner pending'}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">IP Allocation</p>
                <p className="mt-1 font-mono text-white">{service.ip_block ?? service.static_ip ?? 'Pending'}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Contract Window</p>
                <p className="mt-1 text-white">
                  {service.activation_date ? new Date(service.activation_date).toLocaleDateString('en-IN') : '--'}
                  {' '}to{' '}
                  {service.contract_end_date ? new Date(service.contract_end_date).toLocaleDateString('en-IN') : '--'}
                </p>
                <p className="mt-1 text-dim">{service.contract_months ?? '--'} months term</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card title="Operations Guidance">
        {isLoading || !service ? (
          <div className="skeleton h-24 rounded-md" />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-[12px]">
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <p className="font-semibold text-white">Escalation Path</p>
              <p className="mt-2 text-muted">Raise a ticket from this service if throughput drops, jitter rises, or route quality degrades.</p>
            </div>
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <p className="font-semibold text-white">Renewal Watch</p>
              <p className="mt-2 text-muted">
                Contract end: {service.contract_end_date ? new Date(service.contract_end_date).toLocaleDateString('en-IN') : 'not mapped'}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <p className="font-semibold text-white">Commercial Impact</p>
              <p className="mt-2 text-muted">
                Current recurring commitment is {formatCurrency(monthlyCharge)} per month for this service.
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
