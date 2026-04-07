import { useState } from 'react'
import { useAuthStore } from '@netlayer/auth'
import { useSites } from '@/hooks/useQueries'
import { DataTable, SearchInput, StatusPill, BandwidthBar, type Column } from '@netlayer/ui'
import type { Site } from '@netlayer/api'

const COLUMNS: Column<Site>[] = [
  {
    key: 'name',
    header: 'Site',
    render: (s) => (
      <div>
        <p className="font-medium text-white">{s.name}</p>
        <p className="text-[10px] text-muted">{s.address}</p>
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
    render: (s) => <span className="font-mono text-[10px] text-muted">{s.type}</span>,
  },
  {
    key: 'bw',
    header: 'Bandwidth',
    width: '150px',
    render: (s) => (
      <div>
        <BandwidthBar percent={s.bandwidthUsedPercent} />
        <p className="mt-1 font-mono text-[10px] text-muted">
          {Math.round(s.bandwidthMbps * s.bandwidthUsedPercent / 100)} / {s.bandwidthMbps} Mbps
        </p>
      </div>
    ),
  },
  {
    key: 'latency',
    header: 'Latency',
    width: '90px',
    render: (s) => (
      <span className={`font-mono text-xs ${s.latencyMs > 30 ? 'text-status-degraded' : 'text-muted'}`}>
        {s.latencyMs}ms
      </span>
    ),
  },
  {
    key: 'sla',
    header: 'SLA',
    width: '80px',
    render: (s) => (
      <span className={`font-mono text-xs ${s.slaPercent >= 99.5 ? 'text-status-online' : 'text-status-degraded'}`}>
        {s.slaPercent}%
      </span>
    ),
  },
  {
    key: 'location',
    header: 'Location',
    render: (s) => (
      <span className="text-xs text-muted">{s.city}, {s.state}</span>
    ),
  },
]

export function CustomerSites() {
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useSites({
    customerId: user?.organizationId,
    search: search || undefined,
    pageSize: 50,
  })

  const onlineCount = data?.data.filter(s => s.status === 'online').length ?? 0
  const totalCount = data?.data.length ?? 0

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-semibold text-white">My Sites</h1>
          <p className="text-xs text-muted">
            {onlineCount} / {totalCount} online
            {totalCount > 0 && (
              <span className={`ml-2 ${onlineCount === totalCount ? 'text-status-online' : 'text-status-degraded'}`}>
                ({Math.round((onlineCount / totalCount) * 100)}% uptime)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Status summary pills */}
      <div className="flex flex-wrap gap-2">
        {(['online', 'offline', 'degraded', 'maintenance'] as const).map(status => {
          const count = data?.data.filter(s => s.status === status).length ?? 0
          if (!count && status !== 'online') return null
          return (
            <StatusPill key={status} status={status} size="md" />
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search sites, locations…"
          className="w-64"
        />
      </div>

      <div className="card overflow-hidden">
        <DataTable
          columns={COLUMNS}
          data={data?.data ?? []}
          keyExtractor={(s) => s.id}
          loading={isLoading}
          emptyTitle="No sites found"
          stickyHeader
        />
      </div>
    </div>
  )
}
