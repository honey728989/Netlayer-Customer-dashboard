import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, Cpu, MapPin, Network, Ticket } from 'lucide-react'
import { sitesApi, ticketsApi, type Service, type SiteDevice, type SiteDeviceCreatePayload, type SiteEvent, type SiteTraffic, type Ticket as TicketType } from '@netlayer/api'

function metric<T>(data: T[] | undefined, pick: (item: T) => number | undefined) {
  if (!data?.length) return 0
  const latest = data[data.length - 1]
  return Number(pick(latest) ?? 0)
}

export function AdminSiteDetailPage() {
  const { siteId = '' } = useParams()
  const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const to = new Date().toISOString()
  const queryClient = useQueryClient()
  const [deviceForm, setDeviceForm] = useState<SiteDeviceCreatePayload>({
    hostname: '',
    ipAddress: '',
    vendor: '',
    model: '',
    type: 'router',
    status: 'ONLINE',
    zabbixHostId: '',
    monitoringEnabled: true,
    zabbixHostGroup: '',
    notes: '',
  })
  const [deviceError, setDeviceError] = useState('')

  const { data: site } = useQuery({
    queryKey: ['admin', 'site', siteId],
    queryFn: () => sitesApi.getById(siteId),
    enabled: Boolean(siteId),
  })
  const { data: traffic = [] } = useQuery({
    queryKey: ['admin', 'site', siteId, 'traffic'],
    queryFn: () => sitesApi.getTraffic(siteId, from, to),
    enabled: Boolean(siteId),
  })
  const { data: services = [] } = useQuery({
    queryKey: ['admin', 'site', siteId, 'services'],
    queryFn: () => sitesApi.getServices(siteId),
    enabled: Boolean(siteId),
  })
  const { data: devices = [] } = useQuery({
    queryKey: ['admin', 'site', siteId, 'devices'],
    queryFn: () => sitesApi.getDevices(siteId),
    enabled: Boolean(siteId),
  })
  const { data: eventsRaw } = useQuery({
    queryKey: ['admin', 'site', siteId, 'events'],
    queryFn: () => sitesApi.getEvents(siteId, { pageSize: 20 }),
    enabled: Boolean(siteId),
  })
  const { data: ticketsRaw } = useQuery({
    queryKey: ['admin', 'site', siteId, 'tickets'],
    queryFn: () => ticketsApi.list({ pageSize: 100 }),
    enabled: Boolean(siteId),
  })

  const events = eventsRaw?.data ?? []
  const tickets = (ticketsRaw?.data ?? []).filter((ticket: TicketType) => (ticket.site_id ?? ticket.siteId) === siteId)
  const latestInbound = metric<SiteTraffic>(traffic, (item) => item.inboundMbps ?? item.inbound_bps)
  const latestOutbound = metric<SiteTraffic>(traffic, (item) => item.outboundMbps ?? item.outbound_bps)
  const latency = metric<SiteTraffic>(traffic, (item) => item.latency_ms)
  const packetLoss = metric<SiteTraffic>(traffic, (item) => item.packet_loss_pct)

  const createDevice = useMutation({
    mutationFn: (payload: SiteDeviceCreatePayload) => sitesApi.createDevice(siteId, payload),
    onSuccess: async () => {
      setDeviceError('')
      setDeviceForm({
        hostname: '',
        ipAddress: '',
        vendor: '',
        model: '',
        type: 'router',
        status: 'ONLINE',
        zabbixHostId: '',
        monitoringEnabled: true,
        zabbixHostGroup: '',
        notes: '',
      })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'site', siteId, 'devices'] })
    },
    onError: (error: any) => {
      setDeviceError(error?.response?.data?.message ?? 'Failed to map Zabbix device')
    },
  })

  const handleCreateDevice = () => {
    setDeviceError('')
    if (!deviceForm.hostname.trim() || !deviceForm.ipAddress.trim() || !deviceForm.vendor.trim()) {
      setDeviceError('Hostname, IP address, and vendor are required.')
      return
    }
    createDevice.mutate({
      ...deviceForm,
      hostname: deviceForm.hostname.trim(),
      ipAddress: deviceForm.ipAddress.trim(),
      vendor: deviceForm.vendor.trim(),
      model: deviceForm.model?.trim() || undefined,
      zabbixHostId: deviceForm.zabbixHostId?.trim() || undefined,
      zabbixHostGroup: deviceForm.zabbixHostGroup?.trim() || undefined,
      notes: deviceForm.notes?.trim() || undefined,
    })
  }

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-dim">Site Workspace</p>
          <h1 className="font-display text-2xl font-bold text-white">{site?.name ?? 'Site Detail'}</h1>
          <p className="mt-1 text-xs text-muted">
            {(site?.code ?? 'No code')} · {(site?.customer_name ?? site?.customerName ?? 'Unmapped customer')} · {(site?.status ?? 'Unknown')}
          </p>
        </div>
        <Link to="/noc/sites" className="btn-ghost">Back to Sites</Link>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: 'Inbound', value: `${latestInbound.toFixed(1)} Mbps`, icon: Activity },
          { label: 'Outbound', value: `${latestOutbound.toFixed(1)} Mbps`, icon: Activity },
          { label: 'Latency', value: `${latency.toFixed(1)} ms`, icon: Network },
          { label: 'Packet Loss', value: `${packetLoss.toFixed(2)}%`, icon: Cpu },
        ].map((entry) => (
          <div key={entry.label} className="card px-4 py-3">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <entry.icon size={16} />
            </div>
            <p className="font-mono text-xl font-bold text-white">{entry.value}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted">{entry.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="font-display text-sm font-semibold text-white">Location & Access</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs">
                <p className="text-[10px] uppercase tracking-widest text-dim">Address</p>
                <p className="mt-1 text-white">{site?.address ?? 'No address available'}</p>
                <p className="mt-1 text-dim"><MapPin size={12} className="mr-1 inline" />{[site?.city, site?.state].filter(Boolean).join(', ') || 'NA'}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs">
                <p className="text-[10px] uppercase tracking-widest text-dim">Connectivity</p>
                <p className="mt-1 text-white">{site?.pop ?? 'Unknown POP'} · {site?.last_mile_provider ?? 'Unknown last mile'}</p>
                <p className="mt-1 font-mono text-dim">{site?.ip_block ?? 'No IP block'}</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <h2 className="font-display text-sm font-semibold text-white">Service Inventory</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {services.map((service: Service) => (
                <div key={service.id} className="rounded-lg border border-border bg-surface-2 p-3 text-xs">
                  <p className="font-medium text-white">{service.service_type ?? 'ILL'} · {service.bandwidth_mbps ?? 0} Mbps</p>
                  <p className="mt-1 font-mono text-dim">{service.circuit_id ?? service.service_id ?? 'No circuit id'}</p>
                  <p className="mt-1 text-dim">{service.status ?? 'Unknown'} · {service.last_mile ?? 'Unspecified last mile'}</p>
                </div>
              ))}
              {services.length === 0 ? <p className="text-xs text-dim">No services mapped</p> : null}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="font-display text-sm font-semibold text-white">Devices</h2>
            <div className="mt-3 space-y-2 text-xs">
              {devices.map((device: SiteDevice) => (
                <div key={device.id} className="rounded-lg border border-border bg-surface-2 px-3 py-2">
                  <p className="font-medium text-white">{device.hostname ?? device.name ?? 'Device'}</p>
                  <p className="mt-1 text-dim">
                    {device.vendor ?? 'Unknown'} · {(device.model ?? String(device.metadata?.model ?? 'Unknown model'))} · {device.status}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-dim">
                    Zabbix: {device.zabbix_host_id ?? 'Not mapped'}
                  </p>
                </div>
              ))}
              {devices.length === 0 ? <p className="text-dim">No devices discovered</p> : null}
            </div>
            <div className="mt-4 rounded-xl border border-border bg-surface-2 p-3">
              <p className="text-[10px] uppercase tracking-widest text-dim">Add Device / Map Zabbix</p>
              {deviceError ? <p className="mt-2 text-xs text-[color:var(--status-offline)]">{deviceError}</p> : null}
              <div className="mt-3 grid gap-2">
                <input className="input-field" placeholder="Hostname" value={deviceForm.hostname} onChange={(e) => setDeviceForm((current) => ({ ...current, hostname: e.target.value }))} />
                <input className="input-field" placeholder="IP address" value={deviceForm.ipAddress} onChange={(e) => setDeviceForm((current) => ({ ...current, ipAddress: e.target.value }))} />
                <input className="input-field" placeholder="Vendor" value={deviceForm.vendor} onChange={(e) => setDeviceForm((current) => ({ ...current, vendor: e.target.value }))} />
                <input className="input-field" placeholder="Model" value={deviceForm.model ?? ''} onChange={(e) => setDeviceForm((current) => ({ ...current, model: e.target.value }))} />
                <input className="input-field" placeholder="Zabbix host ID" value={deviceForm.zabbixHostId ?? ''} onChange={(e) => setDeviceForm((current) => ({ ...current, zabbixHostId: e.target.value }))} />
                <input className="input-field" placeholder="Zabbix host group" value={deviceForm.zabbixHostGroup ?? ''} onChange={(e) => setDeviceForm((current) => ({ ...current, zabbixHostGroup: e.target.value }))} />
                <button onClick={handleCreateDevice} disabled={createDevice.isPending} className="btn-primary justify-center">
                  {createDevice.isPending ? 'Saving...' : 'Save Device Mapping'}
                </button>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Ticket size={14} className="text-brand" />
              <h2 className="font-display text-sm font-semibold text-white">Open Tickets</h2>
            </div>
            <div className="space-y-2 text-xs">
              {tickets.slice(0, 5).map((ticket: TicketType) => (
                <Link key={ticket.id} to={`/noc/tickets/${ticket.id}`} className="block rounded-lg border border-border bg-surface-2 px-3 py-2 hover:text-white">
                  <p className="font-medium text-white">{ticket.title ?? ticket.subject ?? ticket.description}</p>
                  <p className="mt-1 text-dim">{ticket.priority} · {ticket.status}</p>
                </Link>
              ))}
              {tickets.length === 0 ? <p className="text-dim">No ticket activity</p> : null}
            </div>
          </div>

          <div className="card p-4">
            <h2 className="font-display text-sm font-semibold text-white">Recent Events</h2>
            <div className="mt-3 space-y-2 text-xs">
              {events.slice(0, 5).map((event: SiteEvent) => (
                <div key={event.id} className="rounded-lg border border-border bg-surface-2 px-3 py-2">
                  <p className="font-medium text-white">{event.message}</p>
                  <p className="mt-1 text-dim">{event.source} · {new Date(event.timestamp).toLocaleString('en-IN')}</p>
                </div>
              ))}
              {events.length === 0 ? <p className="text-dim">No recent events</p> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
