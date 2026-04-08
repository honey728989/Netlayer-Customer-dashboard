import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@netlayer/auth'
import { customersApi, type Service } from '@netlayer/api'
import { Card, EmptyState, ErrorState, KpiCard, PageHeader, SearchInput, StatusPill } from '@netlayer/ui'
import { useCustomerPortalSiteFilterStore } from '@/store'

function serviceValue(service: Service, key: keyof Service) {
  return service[key] ?? '--'
}

export function CustomerServicesPage() {
  const { user } = useAuthStore()
  const customerId = user?.customerId ?? user?.organizationId ?? ''
  const [search, setSearch] = useState('')
  const { selectedSiteId, selectedSiteName, city, serviceType } = useCustomerPortalSiteFilterStore()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['customers', customerId, 'services'],
    queryFn: () => customersApi.getServices(customerId),
    enabled: Boolean(customerId),
    staleTime: 60_000,
  })

  const services = data ?? []

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return services.filter((service) => {
      if (selectedSiteId && service.site_id !== selectedSiteId) return false
      if (city && service.city !== city) return false
      if (serviceType && service.service_type !== serviceType) return false

      if (!term) return true

      return [service.service_id, service.circuit_id, service.service_type, service.site_name, service.city, service.state]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    })
  }, [city, search, selectedSiteId, serviceType, services])

  const stats = useMemo(() => {
    const active = filtered.filter((service) => String(service.status ?? '').toUpperCase() === 'ACTIVE').length
    const totalBandwidth = filtered.reduce((sum, service) => sum + Number(service.bandwidth_mbps ?? 0), 0)
    const recurring = filtered.reduce((sum, service) => sum + Number(service.monthly_charge ?? 0), 0)
    return {
      active,
      inactive: Math.max(0, filtered.length - active),
      totalBandwidth,
      recurring,
    }
  }, [filtered])

  const scopeLabel = selectedSiteName ?? (city ? `${city} services` : 'All active services')

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <PageHeader
        title="Service Inventory"
        subtitle="Committed bandwidth, circuit metadata, and service status across the selected customer scope."
      />

      <div
        className="rounded-2xl border px-4 py-3"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface-2)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>
              Service Scope
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {scopeLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border px-2.5 py-1" style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
              {filtered.length} services
            </span>
            <span className="rounded-full border px-2.5 py-1" style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
              {stats.totalBandwidth} Mbps committed
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="Total Services" value={filtered.length} loading={isLoading} accentColor="var(--brand)" />
        <KpiCard label="Active" value={stats.active} loading={isLoading} accentColor="var(--status-online)" />
        <KpiCard label="Inactive" value={stats.inactive} loading={isLoading} accentColor="var(--status-degraded)" />
        <KpiCard label="Recurring MRC" value={`₹${stats.recurring.toLocaleString('en-IN')}`} loading={isLoading} accentColor="var(--status-info)" />
      </div>

      {stats.inactive > 0 && (
        <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {stats.inactive} service(s) in this scope are inactive or suspended. Review site status and ticket history before planning changes.
        </div>
      )}

      <Card title="Service List" action={<SearchInput value={search} onChange={setSearch} placeholder="Search services, circuits, sites..." className="w-64" />}>
        {isError ? (
          <ErrorState message="Failed to load service inventory." onRetry={() => void refetch()} />
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="skeleton h-14 rounded-md" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No services found" description="Try changing the current site scope or search term. Provisioned services will appear here with circuit details." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
                <tr>
                  <th className="table-th">Service</th>
                  <th className="table-th">Circuit</th>
                  <th className="table-th">Type</th>
                  <th className="table-th">Site</th>
                  <th className="table-th">Bandwidth</th>
                  <th className="table-th">POP / Last Mile</th>
                  <th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((service) => (
                  <tr key={service.id} className="table-row">
                    <td className="table-td">
                      <p className="font-mono text-xs text-white">{service.service_id ?? service.id.slice(-8)}</p>
                      <p className="mt-0.5 text-[10px] text-dim">{service.ip_block ?? 'IP block pending'}</p>
                    </td>
                    <td className="table-td font-mono text-xs text-muted">{service.circuit_id ?? '--'}</td>
                    <td className="table-td text-xs text-muted">{service.service_type ?? '--'}</td>
                    <td className="table-td">
                      <p className="text-xs text-white">{service.site_name ?? '--'}</p>
                      <p className="mt-0.5 text-[10px] text-dim">{[service.city, service.state].filter(Boolean).join(', ') || 'Unknown location'}</p>
                    </td>
                    <td className="table-td font-mono text-xs text-muted">{service.bandwidth_mbps ?? 0} Mbps</td>
                    <td className="table-td text-xs text-muted">
                      {[serviceValue(service, 'pop'), serviceValue(service, 'last_mile')].filter((value) => value !== '--').join(' / ') || '--'}
                    </td>
                    <td className="table-td">
                      <StatusPill status={service.status ?? 'unknown'} />
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
