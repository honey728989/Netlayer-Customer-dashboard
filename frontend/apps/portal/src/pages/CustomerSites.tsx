import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Globe, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@netlayer/auth'
import { sitesApi } from '@netlayer/api'
import { CustomerSiteFilterBar } from '@/components/portal/CustomerSiteFilterBar'
import { applySiteFilters } from '@/lib/customerSiteFilters'
import { useCustomerPortalSiteFilterStore } from '@/store'
import type { Site } from '@netlayer/api'

function SiteStatusDot({ status }: { status: string }) {
  const s = status?.toUpperCase()
  const color =
    s === 'UP' || s === 'ONLINE' ? 'var(--status-online)' :
    s === 'DOWN' || s === 'OFFLINE' ? 'var(--status-offline)' :
    s === 'DEGRADED' ? 'var(--status-degraded)' :
    'var(--brand)'
  const label =
    s === 'UP' || s === 'ONLINE' ? 'Online' :
    s === 'DOWN' || s === 'OFFLINE' ? 'Offline' :
    s === 'DEGRADED' ? 'Degraded' :
    s === 'MAINTENANCE' ? 'Maintenance' : status

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      }}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}

export function CustomerSites() {
  const { user } = useAuthStore()
  const customerId = user?.customerId ?? user?.organizationId ?? ''
  const [search, setSearch] = useState('')
  const { selectedSiteId, city, status, serviceType, setSelectedSite } = useCustomerPortalSiteFilterStore()

  const { data: raw, isLoading } = useQuery({
    queryKey: ['sites', 'list', customerId],
    queryFn: () => sitesApi.list({ customerId, pageSize: 100 }),
    enabled: Boolean(customerId),
    staleTime: 30_000,
  })

  const siteList = (Array.isArray(raw) ? raw : (raw as any)?.data ?? []) as Site[]
  const filteredByPortal = applySiteFilters(siteList, { selectedSiteId, city, status, serviceType })
  const filtered = filteredByPortal.filter((site) =>
    !search ||
    site.name?.toLowerCase().includes(search.toLowerCase()) ||
    (site.city ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  const online = siteList.filter((site) => {
    const status = site.status?.toUpperCase()
    return status === 'UP' || status === 'ONLINE'
  }).length
  const unhealthy = filtered.filter((site) => {
    const current = site.status?.toUpperCase()
    return current === 'DOWN' || current === 'OFFLINE' || current === 'DEGRADED'
  }).length
  const scopeLabel = selectedSiteId ? 'Selected site focus' : city ? `${city} sites` : 'Full site portfolio'

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>My Sites</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {isLoading ? 'Loading...' : `${online} of ${siteList.length} online`}
          </p>
        </div>
        <div className="hidden md:flex gap-2">
          {(['UP', 'DOWN', 'DEGRADED'] as const).map((status) => {
            const count = siteList.filter((site) => {
              const current = site.status?.toUpperCase()
              return status === 'UP'
                ? current === 'UP' || current === 'ONLINE'
                : status === 'DOWN'
                  ? current === 'DOWN' || current === 'OFFLINE'
                  : current === status
            }).length

            if (!count) return null

            return (
              <SiteStatusDot
                key={status}
                status={status === 'UP' ? 'ONLINE' : status === 'DOWN' ? 'OFFLINE' : status}
              />
            )
          })}
        </div>
      </div>

      <CustomerSiteFilterBar sites={siteList} />

      <div
        className="rounded-2xl border px-4 py-3"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface-2)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>
              Site Scope
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {scopeLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border px-2.5 py-1" style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
              {filtered.length} visible sites
            </span>
            <span className="rounded-full border px-2.5 py-1" style={{ borderColor: 'var(--border)', color: unhealthy > 0 ? 'var(--status-degraded)' : 'var(--text-dim)' }}>
              {unhealthy} unhealthy
            </span>
          </div>
        </div>
      </div>

      <div className="relative w-64">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
        <input
          className="input-field pl-7 w-full"
          placeholder="Search sites, cities..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
              <tr>
                <th className="table-th">Site</th>
                <th className="table-th">Status</th>
                <th className="table-th">Type</th>
                <th className="table-th">Location</th>
                <th className="table-th">Bandwidth</th>
                <th className="table-th">IP Block</th>
                <th className="table-th w-20 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="table-row">
                    {Array.from({ length: 7 }).map((_, cellIndex) => (
                      <td key={cellIndex} className="table-td">
                        <div className="skeleton h-4 rounded w-full max-w-[100px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    <Globe size={24} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs">{search ? 'No sites match your search' : 'No sites found'}</p>
                  </td>
                </tr>
              ) : (
                filtered.map((site) => (
                  <tr key={site.id} className="table-row">
                    <td className="table-td">
                      <p className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>{site.name}</p>
                      <p className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>{site.code}</p>
                    </td>
                    <td className="table-td">
                      <SiteStatusDot status={site.status} />
                    </td>
                    <td className="table-td">
                      <span
                        className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                          color: 'var(--brand)',
                          backgroundColor: 'color-mix(in srgb, var(--brand) 10%, transparent)',
                          border: '1px solid color-mix(in srgb, var(--brand) 20%, transparent)',
                        }}
                      >
                        {site.type ?? '—'}
                      </span>
                    </td>
                    <td className="table-td">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {[site.city, site.state].filter(Boolean).join(', ') || '—'}
                      </span>
                    </td>
                    <td className="table-td font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                      {site.total_bandwidth_mbps ?? site.bandwidth_mbps ?? site.bandwidthMbps ?? '—'} Mbps
                    </td>
                    <td className="table-td font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
                      {site.ip_block ?? '—'}
                    </td>
                    <td className="table-td text-right">
                      <Link
                        to={`/portal/sites/${site.id}`}
                        onClick={() => setSelectedSite(site.id, site.name)}
                        className="text-[11px] hover:underline"
                        style={{ color: 'var(--brand)' }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && filtered.length > 0 && (
          <div className="px-4 py-2 text-[11px]" style={{ color: 'var(--text-dim)', borderTop: '1px solid var(--border)' }}>
            {filtered.length} site{filtered.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
