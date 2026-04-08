import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@netlayer/auth'
import { customersApi, type Service } from '@netlayer/api'
import { Card, EmptyState, ErrorState, KpiCard, PageHeader, SearchInput, StatusPill } from '@netlayer/ui'

function serviceValue(service: Service, fallback: string) {
  return service[fallback as keyof Service] ?? '—'
}

export function CustomerServicesPage() {
  const { user } = useAuthStore()
  const customerId = user?.customerId ?? user?.organizationId ?? ''
  const [search, setSearch] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['customers', customerId, 'services'],
    queryFn: () => customersApi.getServices(customerId),
    enabled: Boolean(customerId),
    staleTime: 60_000,
  })

  const services = data ?? []

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return services

    return services.filter((service) =>
      [service.service_id, service.circuit_id, service.service_type, service.site_name, service.city, service.state]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    )
  }, [search, services])

  const stats = useMemo(() => {
    const active = services.filter((service) => String(service.status ?? '').toUpperCase() === 'ACTIVE').length
    const totalBandwidth = services.reduce((sum, service) => sum + Number(service.bandwidth_mbps ?? 0), 0)
    return {
      active,
      inactive: Math.max(0, services.length - active),
      totalBandwidth,
    }
  }, [services])

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <PageHeader
        title="Service Inventory"
        subtitle="All customer circuits, bandwidth plans, and service metadata in one place"
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="Total Services" value={services.length} loading={isLoading} accentColor="var(--brand)" />
        <KpiCard label="Active" value={stats.active} loading={isLoading} accentColor="var(--status-online)" />
        <KpiCard label="Inactive" value={stats.inactive} loading={isLoading} accentColor="var(--status-degraded)" />
        <KpiCard label="Committed BW" value={`${stats.totalBandwidth} Mbps`} loading={isLoading} accentColor="var(--status-info)" />
      </div>

      <Card title="Service List" action={<SearchInput value={search} onChange={setSearch} placeholder="Search services, circuits, sites…" className="w-64" />}>
        {isError ? (
          <ErrorState message="Failed to load service inventory." onRetry={() => void refetch()} />
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="skeleton h-14 rounded-md" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No services found" description="Once services are provisioned, they will appear here with circuit and contract details." />
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
                    <td className="table-td font-mono text-xs text-muted">{service.circuit_id ?? '—'}</td>
                    <td className="table-td text-xs text-muted">{service.service_type ?? '—'}</td>
                    <td className="table-td">
                      <p className="text-xs text-white">{service.site_name ?? '—'}</p>
                      <p className="mt-0.5 text-[10px] text-dim">{[service.city, service.state].filter(Boolean).join(', ') || 'Unknown location'}</p>
                    </td>
                    <td className="table-td font-mono text-xs text-muted">{service.bandwidth_mbps ?? 0} Mbps</td>
                    <td className="table-td text-xs text-muted">
                      {[serviceValue(service, 'pop'), serviceValue(service, 'last_mile')].filter((value) => value !== '—').join(' / ') || '—'}
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
