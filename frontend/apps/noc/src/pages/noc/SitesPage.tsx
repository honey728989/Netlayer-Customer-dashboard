import { useState, useCallback } from 'react'
import { Download } from 'lucide-react'
import { useSites } from '@/hooks/useQueries'
import { SiteDrawer } from '@/components/sites/SiteDrawer'
import type { Site } from '@netlayer/api'

function SiteStatusDot({ status }: { status: string }) {
  const s = status?.toUpperCase()
  const color =
    s === 'UP' || s === 'ONLINE'    ? 'var(--status-online)'   :
    s === 'DOWN' || s === 'OFFLINE'  ? 'var(--status-offline)'  :
    s === 'DEGRADED'                 ? 'var(--status-degraded)' :
                                       'var(--brand)'
  const label =
    s === 'UP' || s === 'ONLINE'    ? 'Online'      :
    s === 'DOWN' || s === 'OFFLINE'  ? 'Offline'     :
    s === 'DEGRADED'                 ? 'Degraded'    :
    s === 'MAINTENANCE'              ? 'Maintenance' : status
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
          style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}

const PAGE_SIZE = 20

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Online', value: 'UP' },
  { label: 'Offline', value: 'DOWN' },
  { label: 'Degraded', value: 'DEGRADED' },
  { label: 'Maintenance', value: 'MAINTENANCE' },
]

export function SitesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)

  const { data, isLoading, isError } = useSites({
    search: search || undefined,
    status: statusFilter || undefined,
    page,
    pageSize: PAGE_SIZE,
  })

  // Handle both array and paginated shape
  const siteList = (Array.isArray(data) ? data : (data as any)?.data ?? []) as Site[]
  const total = Array.isArray(data) ? data.length : (data as any)?.total ?? 0
  const totalPages = Array.isArray(data) ? 1 : (data as any)?.totalPages ?? 1

  const handleRowClick = useCallback((siteId: string) => setSelectedSiteId(siteId), [])
  const handleCloseDrawer = useCallback(() => setSelectedSiteId(null), [])

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Sites</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{total} total sites</p>
          </div>
          <button className="btn-ghost gap-1.5">
            <Download size={13} /> Export
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <input className="input-field pl-3 w-64" placeholder="Search sites, customers…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <div className="filter-tab-group">
            {STATUS_FILTERS.map(f => (
              <button key={f.value}
                onClick={() => { setStatusFilter(f.value); setPage(1) }}
                className={statusFilter === f.value ? 'filter-tab-active' : 'filter-tab'}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mx-5 mb-5 card overflow-hidden">
        <div className="overflow-x-auto">
          {isError ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Failed to load sites. Try refreshing.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
                <tr>
                  <th className="table-th">Site Name</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Type</th>
                  <th className="table-th">Customer</th>
                  <th className="table-th">Location</th>
                  <th className="table-th">Bandwidth</th>
                  <th className="table-th">IP Block</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="table-row">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="table-td"><div className="skeleton h-4 rounded w-full max-w-[100px]" /></td>
                      ))}
                    </tr>
                  ))
                ) : siteList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                      No sites found
                    </td>
                  </tr>
                ) : (
                  siteList.map((s: Site) => (
                    <tr key={s.id} className="table-row cursor-pointer"
                        onClick={() => handleRowClick(s.id)}>
                      <td className="table-td">
                        <p className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                        <p className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>{s.code ?? ''}</p>
                      </td>
                      <td className="table-td"><SiteStatusDot status={s.status} /></td>
                      <td className="table-td">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                              style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
                          {s.type ?? '—'}
                        </span>
                      </td>
                      <td className="table-td">
                        <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                          {s.customer_name ?? s.customerName ?? '—'}
                        </span>
                      </td>
                      <td className="table-td text-xs" style={{ color: 'var(--text-muted)' }}>
                        {[s.city, s.state].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="table-td font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                        {s.total_bandwidth_mbps ?? s.bandwidth_mbps ?? s.bandwidthMbps ?? '—'} Mbps
                      </td>
                      <td className="table-td font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
                        {s.ip_block ?? '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="font-mono text-[11px]" style={{ color: 'var(--text-dim)' }}>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-ghost h-7 w-7 p-0 justify-center disabled:opacity-30">‹</button>
              <span className="font-mono text-[11px] min-w-[3rem] text-center" style={{ color: 'var(--text-muted)' }}>{page}/{totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-ghost h-7 w-7 p-0 justify-center disabled:opacity-30">›</button>
            </div>
          </div>
        )}
      </div>

      <SiteDrawer siteId={selectedSiteId} onClose={handleCloseDrawer} />
    </div>
  )
}
