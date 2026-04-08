import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Ticket as TicketIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@netlayer/auth'
import { sitesApi, ticketsApi } from '@netlayer/api'
import { CustomerSiteFilterBar } from '@/components/portal/CustomerSiteFilterBar'
import { applyTicketFilters } from '@/lib/customerSiteFilters'
import { useCustomerPortalSiteFilterStore } from '@/store'
import type { Site, Ticket } from '@netlayer/api'

const STATUS_COLOR: Record<string, string> = {
  OPEN: 'var(--brand)',
  IN_PROGRESS: 'var(--status-info)',
  PENDING: 'var(--status-degraded)',
  RESOLVED: 'var(--status-online)',
  CLOSED: 'var(--text-dim)',
}

function priorityColor(priority: string) {
  const normalized = priority?.toUpperCase()
  if (normalized === 'P1' || normalized === 'CRITICAL') return 'var(--status-offline)'
  if (normalized === 'P2' || normalized === 'HIGH') return 'var(--status-degraded)'
  if (normalized === 'P3' || normalized === 'MEDIUM') return 'var(--status-info)'
  return 'var(--text-muted)'
}

function TicketStatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status?.toUpperCase()] ?? 'var(--text-muted)'
  return (
    <span
      className="inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}
    >
      {(status ?? '').replace('_', ' ')}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const color = priorityColor(priority)
  return (
    <span
      className="inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}
    >
      {priority?.toUpperCase()}
    </span>
  )
}

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
]

export function CustomerTickets() {
  const { user } = useAuthStore()
  const customerId = user?.customerId ?? user?.organizationId ?? ''
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { selectedSiteId, setSelectedSite, city, status, serviceType } = useCustomerPortalSiteFilterStore()

  const { data: sitesResponse } = useQuery({
    queryKey: ['sites', 'list', customerId, 'ticket-filter'],
    queryFn: () => sitesApi.list({ customerId, pageSize: 100 }),
    enabled: Boolean(customerId),
    staleTime: 60_000,
  })

  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['tickets', 'list', customerId, statusFilter],
    queryFn: () =>
      ticketsApi.list({
        customerId,
        status: statusFilter || undefined,
        pageSize: 100,
      }),
    enabled: Boolean(customerId),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const tickets = applyTicketFilters((ticketsData?.data ?? []) as Ticket[], { selectedSiteId })
  const filtered = tickets.filter((ticket) =>
    !search ||
    (ticket.title ?? ticket.subject ?? '').toLowerCase().includes(search.toLowerCase()),
  )
  const sites = (sitesResponse?.data ?? []) as Site[]
  const summary = {
    open: tickets.filter((ticket) => ['OPEN', 'IN_PROGRESS'].includes(String(ticket.status).toUpperCase())).length,
    breached: tickets.filter((ticket) => {
      const dueAt = ticket.resolution_due_at ?? ticket.resolutionDueAt
      return dueAt ? new Date(dueAt).getTime() <= Date.now() : false
    }).length,
    critical: tickets.filter((ticket) => String(ticket.priority).toUpperCase() === 'P1').length,
  }

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Support Tickets</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {ticketsData?.total ?? 0} ticket{(ticketsData?.total ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <Link to={selectedSiteId ? `/portal/tickets/new?siteId=${selectedSiteId}` : '/portal/tickets/new'} className="btn-primary gap-1.5">
          <Plus size={13} /> Raise Ticket
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          ['Open / In Progress', summary.open, 'var(--brand)'],
          ['Breached SLA', summary.breached, 'var(--status-offline)'],
          ['Critical Priority', summary.critical, 'var(--status-degraded)'],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p className="mt-1 font-mono text-xl font-semibold" style={{ color: String(color) }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <input
            className="input-field pl-3 w-56"
            placeholder="Search tickets..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="filter-tab-group">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={statusFilter === tab.value ? 'filter-tab-active' : 'filter-tab'}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <CustomerSiteFilterBar sites={sites.filter((site) => {
        if (city && (site.city ?? '').toLowerCase() !== city.toLowerCase()) return false
        if (status && (site.status ?? '').toUpperCase() !== status.toUpperCase()) return false
        if (serviceType && (site.type ?? '').toUpperCase() !== serviceType.toUpperCase()) return false
        return true
      })} />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
              <tr>
                <th className="table-th w-16">ID</th>
                <th className="table-th">Subject</th>
                <th className="table-th w-24">Priority</th>
                <th className="table-th w-28">Status</th>
                <th className="table-th w-32">SLA Due</th>
                <th className="table-th w-28">Opened</th>
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
                    <TicketIcon size={24} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs">
                      {statusFilter ? 'No tickets with this status' : 'No open tickets - great job!'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((ticket) => {
                  const slaDate = ticket.resolution_due_at ?? ticket.resolutionDueAt
                  const slaMs = slaDate ? new Date(slaDate).getTime() - Date.now() : null
                  const slaBreached = slaMs !== null && slaMs <= 0
                  const slaHours = slaMs !== null ? Math.floor(slaMs / 3_600_000) : null

                  return (
                    <tr key={ticket.id} className="table-row">
                      <td className="table-td">
                        <span className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
                          #{ticket.id.slice(-5)}
                        </span>
                      </td>
                      <td className="table-td">
                        <p className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>
                          {ticket.title ?? ticket.subject}
                        </p>
                        {(ticket.site_name ?? ticket.siteName) && (
                          <p className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
                            {ticket.site_name ?? ticket.siteName}
                          </p>
                        )}
                      </td>
                      <td className="table-td">
                        <PriorityBadge priority={ticket.priority} />
                      </td>
                      <td className="table-td">
                        <TicketStatusBadge status={ticket.status} />
                      </td>
                      <td className="table-td">
                        {!slaDate ? (
                          <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>—</span>
                        ) : slaBreached ? (
                          <span className="font-mono text-[10px]" style={{ color: 'var(--status-offline)' }}>Breached</span>
                        ) : (slaHours ?? 0) < 2 ? (
                          <span className="font-mono text-[10px]" style={{ color: 'var(--status-degraded)' }}>
                            {slaHours}h left
                          </span>
                        ) : (
                          <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {formatDistanceToNow(new Date(slaDate), { addSuffix: true })}
                          </span>
                        )}
                      </td>
                      <td className="table-td font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {formatDistanceToNow(new Date(ticket.created_at ?? ticket.createdAt ?? Date.now()), { addSuffix: true })}
                      </td>
                      <td className="table-td text-right">
                        <Link
                          to={`/portal/tickets/${ticket.id}`}
                          onClick={() => setSelectedSite(ticket.site_id ?? ticket.siteId ?? null, ticket.site_name ?? ticket.siteName ?? null)}
                          className="text-[11px] hover:underline"
                          style={{ color: 'var(--brand)' }}
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && filtered.length > 0 && (
          <div className="px-4 py-2 text-[11px]" style={{ color: 'var(--text-dim)', borderTop: '1px solid var(--border)' }}>
            {filtered.length} ticket{filtered.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
