import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  customersApi,
  sitesApi,
  ticketsApi,
  type Service,
  type SiteBillingSummary,
  type SiteDevice,
  type SiteEvent,
  type SiteTraffic,
  type Ticket,
} from '@netlayer/api'
import { useAuthStore } from '@netlayer/auth'
import { useCustomerPortalSiteFilterStore } from '@/store'
import { Card, PageHeader } from '@netlayer/ui'

function formatDate(value?: string) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-IN')
}

export function CustomerSiteDetailPage() {
  const { siteId = '' } = useParams()
  const { user } = useAuthStore()
  const customerId = user?.customerId ?? user?.organizationId ?? ''
  const { setSelectedSite } = useCustomerPortalSiteFilterStore()

  const { data: site, isLoading: siteLoading } = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => sitesApi.getById(siteId),
    enabled: Boolean(siteId),
    staleTime: 30_000,
  })

  const { data: traffic = [] } = useQuery({
    queryKey: ['site', siteId, 'traffic'],
    queryFn: () => {
      const to = new Date().toISOString()
      const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      return sitesApi.getTraffic(siteId, from, to)
    },
    enabled: Boolean(siteId),
    staleTime: 30_000,
  })

  const { data: devices = [] } = useQuery({
    queryKey: ['site', siteId, 'devices'],
    queryFn: () => sitesApi.getDevices(siteId),
    enabled: Boolean(siteId),
    staleTime: 60_000,
  })

  const { data: eventsResponse } = useQuery({
    queryKey: ['site', siteId, 'events'],
    queryFn: () => sitesApi.getEvents(siteId, { pageSize: 5 }),
    enabled: Boolean(siteId),
    staleTime: 30_000,
  })

  const { data: services = [] } = useQuery({
    queryKey: ['site', siteId, 'services'],
    queryFn: () => sitesApi.getServices(siteId),
    enabled: Boolean(siteId),
    staleTime: 60_000,
  })

  const { data: ticketsResponse } = useQuery({
    queryKey: ['tickets', 'site-detail', siteId],
    queryFn: () => ticketsApi.list({ pageSize: 100 }),
    enabled: Boolean(siteId),
    staleTime: 30_000,
  })
  const { data: grafanaEmbed } = useQuery({
    queryKey: ['site', siteId, 'grafana'],
    queryFn: () => sitesApi.getGrafanaEmbed(siteId),
    enabled: Boolean(siteId),
    staleTime: 30_000,
  })
  const { data: siteBilling = [] } = useQuery({
    queryKey: ['customers', customerId, 'site-billing'],
    queryFn: () => customersApi.getSiteBilling(customerId),
    enabled: Boolean(customerId),
    staleTime: 60_000,
  })

  const latestTraffic = useMemo(() => {
    if (!traffic.length) return null
    return traffic[traffic.length - 1] as SiteTraffic
  }, [traffic])

  const events = (eventsResponse?.data ?? []) as SiteEvent[]
  const siteServices = services as Service[]
  const siteTickets = ((ticketsResponse?.data ?? []) as Ticket[]).filter(
    (ticket) => (ticket.site_id ?? ticket.siteId) === siteId,
  )
  const commercialSummary = useMemo(
    () => ((siteBilling as SiteBillingSummary[]).find((entry) => entry.siteId === siteId) ?? null),
    [siteBilling, siteId],
  )
  const monthlyCharge = siteServices.reduce((sum, service) => sum + Number(service.monthly_charge ?? 0), 0)
  const activeServices = siteServices.filter((service) => (service.status ?? '').toUpperCase() === 'ACTIVE').length

  useEffect(() => {
    if (siteId) {
      setSelectedSite(siteId, site?.name ?? null)
    }
  }, [setSelectedSite, site?.name, siteId])

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <PageHeader
        title={site?.name ?? 'Site Detail'}
        subtitle={site?.code ? `Site code: ${site.code}` : 'Operational, service, and support detail for this site'}
      />

      <div className="flex flex-wrap gap-2">
        <Link to="/portal/sites" className="btn-ghost">Back to Sites</Link>
        <Link to="/portal/tickets/new" className="btn-primary">Raise Ticket</Link>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card title="Site Snapshot">
          {siteLoading ? (
            <div className="space-y-3">
              <div className="skeleton h-5 w-40 rounded" />
              <div className="skeleton h-20 w-full rounded" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                ['Status', site?.status ?? '—'],
                ['Bandwidth', `${site?.total_bandwidth_mbps ?? site?.bandwidth_mbps ?? site?.bandwidthMbps ?? '—'} Mbps`],
                ['Location', [site?.city, site?.state].filter(Boolean).join(', ') || '—'],
                ['POP / Last Mile', [site?.pop, site?.last_mile_provider].filter(Boolean).join(' / ') || '—'],
                ['IP Block', site?.ip_block ?? '—'],
                ['Go Live', formatDate(site?.go_live_date)],
                ['Contract End', formatDate(site?.contract_end_date ?? site?.contractExpiry)],
                ['Devices', String(site?.device_count ?? site?.deviceCount ?? devices.length)],
                ['Active Services', String(activeServices)],
                ['Monthly Charge', monthlyCharge > 0 ? `₹${monthlyCharge.toLocaleString('en-IN')}` : '—'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
                  <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="mt-1 font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card title="Performance Snapshot">
            <div className="space-y-3">
              {[
                ['Inbound', `${Number(latestTraffic?.inboundMbps ?? 0).toFixed(1)} Mbps`],
                ['Outbound', `${Number(latestTraffic?.outboundMbps ?? 0).toFixed(1)} Mbps`],
                ['Latency', `${Number(latestTraffic?.latency_ms ?? site?.latencyMs ?? 0).toFixed(1)} ms`],
                ['Packet Loss', `${Number(latestTraffic?.packet_loss_pct ?? site?.packetLossPercent ?? 0).toFixed(2)}%`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span className="font-mono text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Commercial Summary">
            {commercialSummary ? (
              <div className="space-y-3">
                {[
                  ['Monthly Recurring', `Rs ${Number(commercialSummary.monthlyRecurringAmount ?? 0).toLocaleString('en-IN')}`],
                  ['Outstanding Share', `Rs ${Number(commercialSummary.estimatedOutstandingAmount ?? 0).toLocaleString('en-IN')}`],
                  ['Portfolio Share', `${Number(commercialSummary.portfolioSharePct ?? 0).toFixed(1)}%`],
                  ['Contract End', formatDate(commercialSummary.contractEndDate ?? undefined)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <span className="font-mono text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</span>
                  </div>
                ))}
                <Link to="/portal/billing" className="btn-ghost w-full justify-center">
                  Open Billing Workspace
                </Link>
              </div>
            ) : (
              <div className="rounded-xl border px-4 py-5 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                Site-wise billing split abhi available nahi hai. Admin panel me billable services aur Zoho billing mapping complete karo.
              </div>
            )}
          </Card>
        </div>
      </div>

      <Card title="Live Performance Graphs">
        {grafanaEmbed?.available && grafanaEmbed.embedUrl ? (
          <div className="h-[420px] overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)' }}>
            <iframe
              src={grafanaEmbed.embedUrl}
              title="Site performance graphs"
              className="h-full w-full border-0"
            />
          </div>
        ) : (
          <div className="rounded-xl border px-4 py-5 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            Grafana dashboard mapping abhi configured nahi hai. Admin panel me is site ke against dashboard UID map karo.
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Service Inventory">
          <div className="space-y-2">
            {siteServices.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No services mapped to this site yet.</p>
            ) : (
              siteServices.map((service) => (
                <div key={service.id} className="rounded-lg border px-3 py-3" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {service.service_id ?? service.circuit_id ?? service.id}
                      </p>
                      <p className="mt-1 font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
                        {[service.service_type, service.pop, service.last_mile].filter(Boolean).join(' • ') || 'Managed service'}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--brand)' }}>{service.status ?? '—'}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                    <div className="rounded-md bg-surface-2 px-2 py-1">
                      <p className="text-dim">Bandwidth</p>
                      <p className="mt-0.5 font-mono text-white">{service.bandwidth_mbps ?? 0} Mbps</p>
                    </div>
                    <div className="rounded-md bg-surface-2 px-2 py-1">
                      <p className="text-dim">Monthly</p>
                      <p className="mt-0.5 font-mono text-white">
                        {service.monthly_charge ? `₹${Number(service.monthly_charge).toLocaleString('en-IN')}` : '—'}
                      </p>
                    </div>
                    <div className="rounded-md bg-surface-2 px-2 py-1">
                      <p className="text-dim">Static IP</p>
                      <p className="mt-0.5 font-mono text-white">{service.static_ip ?? service.ip_block ?? '—'}</p>
                    </div>
                    <div className="rounded-md bg-surface-2 px-2 py-1">
                      <p className="text-dim">Contract End</p>
                      <p className="mt-0.5 font-mono text-white">{formatDate(service.contract_end_date)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Connected Devices">
          <div className="space-y-2">
            {(devices as SiteDevice[]).length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No device metadata available for this site yet.</p>
            ) : (
              (devices as SiteDevice[]).map((device) => (
                <div key={device.id} className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{device.hostname ?? device.name ?? device.id}</p>
                    <p className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
                      {[device.type, device.vendor, device.model].filter(Boolean).join(' • ') || 'Device'}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--brand)' }}>{device.status}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Site Tickets">
          <div className="space-y-2">
            {siteTickets.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No tickets logged against this site yet.</p>
            ) : (
              siteTickets.slice(0, 6).map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/portal/tickets/${ticket.id}`}
                  className="block rounded-lg border px-3 py-3 transition-colors hover:bg-surface-2"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{ticket.title ?? ticket.subject}</p>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--brand)' }}>{ticket.priority}</span>
                  </div>
                  <p className="mt-1 text-[10px]" style={{ color: 'var(--text-dim)' }}>
                    {ticket.status} • {formatDate(ticket.created_at ?? ticket.createdAt)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card title="Recent Site Events">
          <div className="space-y-2">
            {events.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No recent events found.</p>
            ) : (
              events.map((event) => (
                <div key={event.id} className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{event.message}</p>
                    <span className="text-[10px] font-mono uppercase" style={{ color: 'var(--brand)' }}>{event.severity}</span>
                  </div>
                  <p className="mt-1 font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
                    {formatDate(event.timestamp)} • {event.source}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
