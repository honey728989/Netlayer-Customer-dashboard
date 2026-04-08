import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  customersApi,
  sitesApi,
  type ServiceCreatePayload,
  type SiteCreatePayload,
  type SiteDeviceCreatePayload,
} from '@netlayer/api'

const siteDefaults: SiteCreatePayload = {
  code: '',
  name: '',
  region: '',
  city: '',
  state: '',
  address: '',
  status: 'UP',
  ipBlock: '',
  pop: '',
  lastMileProvider: '',
  dashboardUid: '',
  goLiveDate: '',
  contractEndDate: '',
}

const serviceDefaults: ServiceCreatePayload = {
  serviceId: '',
  circuitId: '',
  serviceType: 'ILL',
  bandwidthMbps: 100,
  pop: '',
  lastMile: '',
  ipBlock: '',
  status: 'ACTIVE',
  activationDate: '',
  contractEndDate: '',
  contractMonths: 12,
  monthlyCharge: 0,
}

const deviceDefaults: SiteDeviceCreatePayload = {
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
}

function StepCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-3">
      <p className="text-xs font-semibold text-white">{title}</p>
      <p className="mt-1 text-[11px] text-dim">{detail}</p>
    </div>
  )
}

export function AdminSiteOnboardingPage() {
  const { customerId = '' } = useParams()
  const [siteForm, setSiteForm] = useState<SiteCreatePayload>(siteDefaults)
  const [serviceForm, setServiceForm] = useState<ServiceCreatePayload>(serviceDefaults)
  const [deviceForm, setDeviceForm] = useState<SiteDeviceCreatePayload>(deviceDefaults)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<string[]>([])
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: customer } = useQuery({
    queryKey: ['admin', 'customer', customerId],
    queryFn: () => customersApi.getById(customerId),
    enabled: Boolean(customerId),
  })

  const createProvisionedSite = useMutation({
    mutationFn: async () => {
      setProgress([])

      setProgress((items) => [...items, 'Creating site'])
      const site = await sitesApi.createForCustomer(customerId, {
        ...siteForm,
        code: siteForm.code?.trim() || undefined,
        city: siteForm.city?.trim() || undefined,
        state: siteForm.state?.trim() || undefined,
        ipBlock: siteForm.ipBlock?.trim() || undefined,
        pop: siteForm.pop?.trim() || undefined,
        lastMileProvider: siteForm.lastMileProvider?.trim() || undefined,
        dashboardUid: siteForm.dashboardUid?.trim() || undefined,
        goLiveDate: siteForm.goLiveDate?.trim() || undefined,
        contractEndDate: siteForm.contractEndDate?.trim() || undefined,
      })

      setProgress((items) => [...items, 'Creating initial service'])
      await sitesApi.createService(site.id, {
        ...serviceForm,
        serviceId: serviceForm.serviceId?.trim() || undefined,
        circuitId: serviceForm.circuitId?.trim() || undefined,
        pop: serviceForm.pop?.trim() || siteForm.pop?.trim() || undefined,
        lastMile: serviceForm.lastMile?.trim() || siteForm.lastMileProvider?.trim() || undefined,
        ipBlock: serviceForm.ipBlock?.trim() || siteForm.ipBlock?.trim() || undefined,
        activationDate: serviceForm.activationDate?.trim() || siteForm.goLiveDate?.trim() || undefined,
        contractEndDate: serviceForm.contractEndDate?.trim() || siteForm.contractEndDate?.trim() || undefined,
      })

      setProgress((items) => [...items, 'Adding primary device and Zabbix mapping'])
      await sitesApi.createDevice(site.id, {
        ...deviceForm,
        hostname: deviceForm.hostname.trim(),
        ipAddress: deviceForm.ipAddress.trim(),
        vendor: deviceForm.vendor.trim(),
        model: deviceForm.model?.trim() || undefined,
        zabbixHostId: deviceForm.zabbixHostId?.trim() || undefined,
        zabbixHostGroup: deviceForm.zabbixHostGroup?.trim() || undefined,
        notes: deviceForm.notes?.trim() || undefined,
      })

      setProgress((items) => [...items, 'Site provisioning complete'])
      return site
    },
    onSuccess: async (site) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'customer', customerId, 'sites'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'customer', customerId, 'readiness'] }),
        queryClient.invalidateQueries({ queryKey: ['sites'] }),
      ])
      navigate(`/noc/sites/${site.id}`)
    },
    onError: (mutationError: any) => {
      setError(mutationError?.response?.data?.message ?? mutationError?.message ?? 'Failed to provision site')
    },
  })

  const handleSubmit = () => {
    setError('')
    if (!siteForm.name.trim() || !siteForm.region.trim() || !siteForm.address.trim()) {
      setError('Site name, region, and address are required.')
      return
    }
    if (!serviceForm.serviceType.trim() || Number(serviceForm.bandwidthMbps) <= 0) {
      setError('Service type and bandwidth are required.')
      return
    }
    if (!deviceForm.hostname.trim() || !deviceForm.ipAddress.trim() || !deviceForm.vendor.trim()) {
      setError('Device hostname, IP address, and vendor are required.')
      return
    }

    createProvisionedSite.mutate()
  }

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-dim">Multi-Site Provisioning</p>
          <h1 className="font-display text-2xl font-bold text-white">Add Another Site</h1>
          <p className="mt-1 text-xs text-muted">
            {customer?.name ?? 'Customer'} ke under new site ko full provisioning standard ke saath add karo: site, service, device, Zabbix, and Grafana.
          </p>
        </div>
        <Link to={`/noc/customers/${customerId}`} className="btn-ghost">Back to Customer</Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-[color:var(--status-offline)] bg-[color:color-mix(in_srgb,var(--status-offline)_10%,transparent)] px-4 py-3 text-sm text-[color:var(--status-offline)]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.8fr]">
        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="font-display text-sm font-semibold text-white">1. Site Profile</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input className="input-field" placeholder="Site name" value={siteForm.name} onChange={(e) => setSiteForm((s) => ({ ...s, name: e.target.value }))} />
              <input className="input-field" placeholder="Site code (optional)" value={siteForm.code ?? ''} onChange={(e) => setSiteForm((s) => ({ ...s, code: e.target.value }))} />
              <input className="input-field" placeholder="Region" value={siteForm.region} onChange={(e) => setSiteForm((s) => ({ ...s, region: e.target.value }))} />
              <select className="input-field" value={siteForm.status ?? 'UP'} onChange={(e) => setSiteForm((s) => ({ ...s, status: e.target.value }))}>
                <option value="UP">UP</option>
                <option value="DOWN">DOWN</option>
                <option value="DEGRADED">DEGRADED</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
              <input className="input-field" placeholder="City" value={siteForm.city ?? ''} onChange={(e) => setSiteForm((s) => ({ ...s, city: e.target.value }))} />
              <input className="input-field" placeholder="State" value={siteForm.state ?? ''} onChange={(e) => setSiteForm((s) => ({ ...s, state: e.target.value }))} />
              <input className="input-field" placeholder="POP" value={siteForm.pop ?? ''} onChange={(e) => setSiteForm((s) => ({ ...s, pop: e.target.value }))} />
              <input className="input-field" placeholder="Last mile provider" value={siteForm.lastMileProvider ?? ''} onChange={(e) => setSiteForm((s) => ({ ...s, lastMileProvider: e.target.value }))} />
              <input className="input-field" placeholder="IP block" value={siteForm.ipBlock ?? ''} onChange={(e) => setSiteForm((s) => ({ ...s, ipBlock: e.target.value }))} />
              <input className="input-field" placeholder="Grafana dashboard UID" value={siteForm.dashboardUid ?? ''} onChange={(e) => setSiteForm((s) => ({ ...s, dashboardUid: e.target.value }))} />
              <input className="input-field" type="date" value={siteForm.goLiveDate ?? ''} onChange={(e) => setSiteForm((s) => ({ ...s, goLiveDate: e.target.value }))} />
              <input className="input-field" type="date" value={siteForm.contractEndDate ?? ''} onChange={(e) => setSiteForm((s) => ({ ...s, contractEndDate: e.target.value }))} />
              <textarea className="input-field min-h-[100px] md:col-span-2" placeholder="Full address" value={siteForm.address} onChange={(e) => setSiteForm((s) => ({ ...s, address: e.target.value }))} />
            </div>
          </div>

          <div className="card p-4">
            <h2 className="font-display text-sm font-semibold text-white">2. Initial Service</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input className="input-field" placeholder="Service ID (optional)" value={serviceForm.serviceId ?? ''} onChange={(e) => setServiceForm((s) => ({ ...s, serviceId: e.target.value }))} />
              <input className="input-field" placeholder="Circuit ID (optional)" value={serviceForm.circuitId ?? ''} onChange={(e) => setServiceForm((s) => ({ ...s, circuitId: e.target.value }))} />
              <select className="input-field" value={serviceForm.serviceType} onChange={(e) => setServiceForm((s) => ({ ...s, serviceType: e.target.value }))}>
                <option value="ILL">ILL</option>
                <option value="Business Broadband">Business Broadband</option>
                <option value="MPLS">MPLS</option>
                <option value="Managed Link">Managed Link</option>
              </select>
              <input className="input-field" type="number" placeholder="Bandwidth Mbps" value={serviceForm.bandwidthMbps} onChange={(e) => setServiceForm((s) => ({ ...s, bandwidthMbps: Number(e.target.value) }))} />
              <input className="input-field" type="number" placeholder="Monthly charge" value={serviceForm.monthlyCharge ?? 0} onChange={(e) => setServiceForm((s) => ({ ...s, monthlyCharge: Number(e.target.value) }))} />
              <input className="input-field" type="number" placeholder="Contract months" value={serviceForm.contractMonths ?? 12} onChange={(e) => setServiceForm((s) => ({ ...s, contractMonths: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="card p-4">
            <h2 className="font-display text-sm font-semibold text-white">3. Primary Device & Zabbix</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input className="input-field" placeholder="Device hostname" value={deviceForm.hostname} onChange={(e) => setDeviceForm((d) => ({ ...d, hostname: e.target.value }))} />
              <input className="input-field" placeholder="Device IP address" value={deviceForm.ipAddress} onChange={(e) => setDeviceForm((d) => ({ ...d, ipAddress: e.target.value }))} />
              <input className="input-field" placeholder="Vendor" value={deviceForm.vendor} onChange={(e) => setDeviceForm((d) => ({ ...d, vendor: e.target.value }))} />
              <input className="input-field" placeholder="Model" value={deviceForm.model ?? ''} onChange={(e) => setDeviceForm((d) => ({ ...d, model: e.target.value }))} />
              <select className="input-field" value={deviceForm.type ?? 'router'} onChange={(e) => setDeviceForm((d) => ({ ...d, type: e.target.value as SiteDeviceCreatePayload['type'] }))}>
                <option value="router">Router</option>
                <option value="switch">Switch</option>
                <option value="firewall">Firewall</option>
                <option value="cpe">CPE</option>
              </select>
              <input className="input-field" placeholder="Zabbix host ID" value={deviceForm.zabbixHostId ?? ''} onChange={(e) => setDeviceForm((d) => ({ ...d, zabbixHostId: e.target.value }))} />
              <input className="input-field md:col-span-2" placeholder="Zabbix host group (optional)" value={deviceForm.zabbixHostGroup ?? ''} onChange={(e) => setDeviceForm((d) => ({ ...d, zabbixHostGroup: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="font-display text-sm font-semibold text-white">Provisioning Standard</h2>
            <div className="mt-3 space-y-2 text-xs text-muted">
              <StepCard title="Site created" detail="Physical branch/site gets created under the selected customer." />
              <StepCard title="Service linked" detail="Recurring commercial and service inventory become available for this site." />
              <StepCard title="Zabbix mapped" detail="Primary device gets a Zabbix host ID so alerts can flow customer-wise." />
              <StepCard title="Grafana ready" detail="Dashboard UID is stored on the site for customer portal graph embedding." />
            </div>
          </div>

          <div className="card p-4">
            <h2 className="font-display text-sm font-semibold text-white">Live Progress</h2>
            <div className="mt-3 space-y-2 text-xs text-muted">
              {progress.length === 0 ? (
                <p>Provisioning steps will appear here after you start the flow.</p>
              ) : (
                progress.map((item, index) => (
                  <div key={`${item}-${index}`} className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-white">
                    {item}
                  </div>
                ))
              )}
            </div>
          </div>

          <button onClick={handleSubmit} disabled={createProvisionedSite.isPending} className="btn-primary w-full justify-center">
            {createProvisionedSite.isPending ? 'Provisioning Site...' : 'Create Site, Service & Device'}
          </button>
        </div>
      </div>
    </div>
  )
}
