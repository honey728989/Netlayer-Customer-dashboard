import { useState, useCallback } from 'react'
import { Download, Filter } from 'lucide-react'
import { useSites } from '@/hooks/useQueries'
import { StatusPill, DataTable, SearchInput, BandwidthBar, type Column } from '@netlayer/ui'
import { SiteDrawer } from '@/components/sites/SiteDrawer'
import type { Site, SiteStatus } from '@netlayer/api'

const STATUS_FILTERS: Array<{ label: string; value: SiteStatus | '' }> = [
  { label: 'All', value: '' },
  { label: 'Online', value: 'online' },
  { label: 'Offline', value: 'offline' },
  { label: 'Degraded', value: 'degraded' },
  { label: 'Maintenance', value: 'maintenance' },
]

const COLUMNS: Column<Site>[] = [
  {
    key: 'name',
    header: 'Site Name',
    render: (s) => (
      <div>
        <p className="font-medium text-white">{s.name}</p>
        <p className="font-mono text-[10px] text-muted">{s.uplinkIp}</p>
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    width: '110px',
    render: (s) => <StatusPill status={s.status} />,
  },
  {
    key: 'type',
    header: 'Type',
    width: '130px',
    render: (s) => (
      <span className="font-mono text-[10px] text-muted">{s.type}</span>
    ),
  },
  {
    key: 'customer',
    header: 'Customer',
    render: (s) => <span className="text-xs">{s.customerName}</span>,
  },
  {
    key: 'bandwidth',
    header: 'BW Usage',
    width: '130px',
    render: (s) => <BandwidthBar percent={s.bandwidthUsedPercent} />,
  },
  {
    key: 'latency',
    header: 'Latency',
    width: '90px',
    render: (s) => (
      <span
        className={
          s.latencyMs > 30
            ? 'font-mono text-xs text-status-degraded'
            : 'font-mono text-xs text-muted'
        }
      >
        {s.latencyMs}ms
      </span>
    ),
  },
  {
    key: 'location',
    header: 'Location',
    render: (s) => (
      <span className="text-xs text-muted">
        {s.city}, {s.state}
      </span>
    ),
  },
]

export function SitesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SiteStatus | ''>('')
  const [page, setPage] = useState(1)
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)

  const { data, isLoading, isError } = useSites({
    search: search || undefined,
    status: statusFilter || undefined,
    page,
    pageSize: 20,
  })

  const handleRowClick = useCallback((site: Site) => {
    setSelectedSiteId(site.id)
  }, [])

  const handleCloseDrawer = useCallback(() => {
    setSelectedSiteId(null)
  }, [])

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-semibold text-white">Sites</h1>
          <p className="text-xs text-muted">
            {data?.total ?? 0} total sites
          </p>
        </div>
        <button className="btn-ghost">
          <Download size={13} />
          Export
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search sites, IPs, customers…"
          className="w-64"
        />

        <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1) }}
              className={
                statusFilter === f.value
                  ? 'rounded px-2.5 py-1 text-[11px] font-semibold bg-brand/15 text-brand'
                  : 'rounded px-2.5 py-1 text-[11px] text-muted hover:text-white transition-colors'
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        <button className="btn-ghost ml-auto">
          <Filter size={13} />
          More filters
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isError ? (
          <p className="p-8 text-center text-xs text-muted">Failed to load sites.</p>
        ) : (
          <DataTable
            columns={COLUMNS}
            data={data?.data ?? []}
            keyExtractor={(s) => s.id}
            onRowClick={handleRowClick}
            loading={isLoading}
            emptyTitle="No sites found"
            emptyDescription="Try adjusting your search or filters."
            stickyHeader
          />
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of {data.total}
          </span>
          <div className="flex gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn-ghost disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="btn-ghost disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      <SiteDrawer siteId={selectedSiteId} onClose={handleCloseDrawer} />
    </div>
  )
}
