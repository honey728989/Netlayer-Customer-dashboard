import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  customersApi,
  sitesApi,
  type CustomerCreatePayload,
  type ServiceCreatePayload,
  type SiteCreatePayload,
  type SiteDeviceCreatePayload,
} from '@netlayer/api'

const customerDefaults: CustomerCreatePayload = {
  name: '',
  code: '',
  tier: 'ENTERPRISE',
  industry: '',
  accountManager: '',
  slaProfile: 'GOLD',
  billingEmail: '',
  primaryContactName: '',
  primaryContactPhone: '',
  primaryContactEmail: '',
  zohoCustomerId: '',
  gstin: '',
  monthlyRecurringRevenue: 0,
  annualContractValue: 0,
  portalAdminEmail: '',
  portalAdminFullName: '',
  portalAdminPassword: 'Customer@123',
}

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

function ChecklistItem({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-3">
      <p className="text-xs font-semibold text-white">{title}</p>
      <p className="mt-1 text-[11px] text-dim">{detail}</p>
    </div>
  )
}

export function AdminCustomerOnboardingPage() {
  const [customerForm, setCustomerForm] = useState<CustomerCreatePayload>(customerDefaults)
  const [siteForm, setSiteForm] = useState<SiteCreatePayload>(siteDefaults)
  const [serviceForm, setServiceForm] = useState<ServiceCreatePayload>(serviceDefaults)
  const [deviceForm, setDeviceForm] = useState<SiteDeviceCreatePayload>(deviceDefaults)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<string[]>([])
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const createWizard = useMutation({
    mutationFn: async () => {
      setProgress([])

      setProgress((items) => [...items, 'Creating customer and portal admin'])
      const customer = await customersApi.create({
        ...customerForm,
        code: customerForm.code?.trim() || undefined,
        industry: customerForm.industry?.trim() || undefined,
        billingEmail: customerForm.billingEmail?.trim() || undefined,
        primaryContactName: customerForm.primaryContactName?.trim() || undefined,
        primaryContactPhone: customerForm.primaryContactPhone?.trim() || undefined,
        primaryContactEmail: customerForm.primaryContactEmail?.trim() || undefined,
        zohoCustomerId: customerForm.zohoCustomerId?.trim() || undefined,
        gstin: customerForm.gstin?.trim() || undefined,
        portalAdminEmail: customerForm.portalAdminEmail.trim().toLowerCase(),
        portalAdminFullName: customerForm.portalAdminFullName.trim(),
      })

      setProgress((items) => [...items, 'Provisioning first site'])
      const site = await sitesApi.createForCustomer(customer.id, {
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

      setProgress((items) => [...items, 'Creating initial service mapping'])
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

      setProgress((items) => [...items, 'Mapping device and Zabbix host'])
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

      if (customerForm.zohoCustomerId?.trim()) {
        setProgress((items) => [...items, 'Triggering Zoho billing sync'])
        await customersApi.syncBilling(customer.id)
      }

      setProgress((items) => [...items, 'Onboarding wizard complete'])
      return customer
    },
    onSuccess: async (customer) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
        queryClient.invalidateQueries({ queryKey: ['sites'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'customer', customer.id] }),
      ])
      navigate(`/noc/customers/${customer.id}`)
    },
    onError: (mutationError: any) => {
      setError(mutationError?.response?.data?.message ?? mutationError?.message ?? 'Failed to complete onboarding wizard')
    },
  })

  const handleSubmit = () => {
    setError('')
    if (!customerForm.name.trim() || !customerForm.accountManager.trim() || !customerForm.portalAdminEmail.trim() || !customerForm.portalAdminFullName.trim()) {
      setError('Customer name, account manager, portal admin name, and portal admin email are required.')
      return
    }
    if (!siteForm.name.trim() || !siteForm.region.trim() || !siteForm.address.trim()) {
      setError('Site name, region, and address are required.')
      return
    }
    if (!serviceForm.serviceType.trim() || Number(serviceForm.bandwidthMbps) <= 0) {
      setError('Initial service type and bandwidth are required.')
      return
    }
    if (!deviceForm.hostname.trim() || !deviceForm.ipAddress.trim() || !deviceForm.vendor.trim()) {
      setError('Device hostname, device IP, and vendor are required.')
      return
    }

    createWizard.mutate()
  }

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-dim">Admin Onboarding Wizard</p>
          <h1 className="font-display text-2xl font-bold text-white">Provision Customer End-to-End</h1>
          <p className="mt-1 text-xs text-muted">
            Create customer, portal admin, first site, first service, Zabbix device mapping, Grafana link, and Zoho billing mapping in one flow.
          </p>
        </div>
        <Link to="/noc/customers" className="btn-ghost">Back to Customers</Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-[color:var(--status-offline)] bg-[color:color-mix(in_srgb,var(--status-offline)_10%,transparent)] px-4 py-3 text-sm text-[color:var(--status-offline)]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="font-display text-sm font-semibold text-white">1. Customer & Portal Admin</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input className="input-field" placeholder="Customer name" value={customerForm.name} onChange={(e) => setCustomerForm((c) => ({ ...c, name: e.target.value }))} />
              <input className="input-field" placeholder="Customer code (optional)" value={customerForm.code ?? ''} onChange={(e) => setCustomerForm((c) => ({ ...c, code: e.target.value }))} />
              <select className="input-field" value={customerForm.tier} onChange={(e) => setCustomerForm((c) => ({ ...c, tier: e.target.value }))}>
                <option value="ENTERPRISE">Enterprise</option>
                <option value="BUSINESS">Business</option>
              </select>
              <input className="input-field" placeholder="Industry" value={customerForm.industry ?? ''} onChange={(e) => setCustomerForm((c) => ({ ...c, industry: e.target.value }))} />
              <input className="input-field" placeholder="Account manager" value={customerForm.accountManager} onChange={(e) => setCustomerForm((c) => ({ ...c, accountManager: e.target.value }))} />
              <select className="input-field" value={customerForm.slaProfile} onChange={(e) => setCustomerForm((c) => ({ ...c, slaProfile: e.target.value }))}>
                <option value="PLATINUM">Platinum</option>
                <option value="GOLD">Gold</option>
                <option value="SILVER">Silver</option>
              </select>
              <input className="input-field" placeholder="Billing email" value={customerForm.billingEmail ?? ''} onChange={(e) => setCustomerForm((c) => ({ ...c, billingEmail: e.target.value }))} />
              <input className="input-field" placeholder="Zoho customer ID" value={customerForm.zohoCustomerId ?? ''} onChange={(e) => setCustomerForm((c) => ({ ...c, zohoCustomerId: e.target.value }))} />
              <input className="input-field" placeholder="Primary contact name" value={customerForm.primaryContactName ?? ''} onChange={(e) => setCustomerForm((c) => ({ ...c, primaryContactName: e.target.value }))} />
              <input className="input-field" placeholder="Primary contact phone" value={customerForm.primaryContactPhone ?? ''} onChange={(e) => setCustomerForm((c) => ({ ...c, primaryContactPhone: e.target.value }))} />
              <input className="input-field" placeholder="Portal admin full name" value={customerForm.portalAdminFullName} onChange={(e) => setCustomerForm((c) => ({ ...c, portalAdminFullName: e.target.value }))} />
              <input className="input-field" placeholder="Portal admin email" value={customerForm.portalAdminEmail} onChange={(e) => setCustomerForm((c) => ({ ...c, portalAdminEmail: e.target.value }))} />
              <input className="input-field" placeholder="Temporary portal password" value={customerForm.portalAdminPassword} onChange={(e) => setCustomerForm((c) => ({ ...c, portalAdminPassword: e.target.value }))} />
              <input className="input-field" type="number" placeholder="Monthly recurring revenue" value={customerForm.monthlyRecurringRevenue ?? 0} onChange={(e) => setCustomerForm((c) => ({ ...c, monthlyRecurringRevenue: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="card p-4">
            <h2 className="font-display text-sm font-semibold text-white">2. First Site & Grafana Mapping</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input className="input-field" placeholder="Site name" value={siteForm.name} onChange={(e) => setSiteForm((s) => ({ ...s, name: e.target.value }))} />
              <input className="input-field" placeholder="Site code (optional)" value={siteForm.code ?? ''} onChange={(e) => setSiteForm((s) => ({ ...s, code: e.target.value }))} />
              <input className="input-field" placeholder="Region" value={siteForm.region} onChange={(e) => setSiteForm((s) => ({ ...s, region: e.target.value }))} />
              <input className="input-field" placeholder="City" value={siteForm.city ?? ''} onChange={(e) => setSiteForm((s) => ({ ...s, city: e.target.value }))} />
              <input className="input-field" placeholder="State" value={siteForm.state ?? ''} onChange={(e) => setSiteForm((s) => ({ ...s, state: e.target.value }))} />
              <input className="input-field" placeholder="POP" value={siteForm.pop ?? ''} onChange={(e) => setSiteForm((s) => ({ ...s, pop: e.target.value }))} />
              <input className="input-field" placeholder="Last mile provider" value={siteForm.lastMileProvider ?? ''} onChange={(e) => setSiteForm((s) => ({ ...s, lastMileProvider: e.target.value }))} />
              <input className="input-field" placeholder="IP block" value={siteForm.ipBlock ?? ''} onChange={(e) => setSiteForm((s) => ({ ...s, ipBlock: e.target.value }))} />
              <input className="input-field md:col-span-2" placeholder="Grafana dashboard UID" value={siteForm.dashboardUid ?? ''} onChange={(e) => setSiteForm((s) => ({ ...s, dashboardUid: e.target.value }))} />
              <textarea className="input-field min-h-[100px] md:col-span-2" placeholder="Full site address" value={siteForm.address} onChange={(e) => setSiteForm((s) => ({ ...s, address: e.target.value }))} />
            </div>
          </div>

          <div className="card p-4">
            <h2 className="font-display text-sm font-semibold text-white">3. First Service & Billing Alignment</h2>
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
            <h2 className="font-display text-sm font-semibold text-white">4. Device & Zabbix Mapping</h2>
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
            <h2 className="font-display text-sm font-semibold text-white">Wizard Outcome</h2>
            <div className="mt-3 space-y-2 text-xs text-muted">
              <ChecklistItem title="Customer & login ready" detail="Creates customer master and initial ENTERPRISE_ADMIN user." />
              <ChecklistItem title="Site and Grafana ready" detail="Creates first site and stores Grafana dashboard UID for embedded graphs." />
              <ChecklistItem title="Service ready" detail="Creates first billable service so site and billing summaries become meaningful." />
              <ChecklistItem title="Zabbix ready" detail="Adds first device and maps Zabbix host ID so monitoring can flow into alerts." />
              <ChecklistItem title="Zoho billing ready" detail="If Zoho customer ID is provided, the wizard triggers invoice sync automatically." />
            </div>
          </div>

          <div className="card p-4">
            <h2 className="font-display text-sm font-semibold text-white">Live Progress</h2>
            <div className="mt-3 space-y-2 text-xs text-muted">
              {progress.length === 0 ? (
                <p>Wizard steps will appear here while provisioning runs.</p>
              ) : (
                progress.map((item, index) => (
                  <div key={`${item}-${index}`} className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-white">
                    {item}
                  </div>
                ))
              )}
            </div>
          </div>

          <button onClick={handleSubmit} disabled={createWizard.isPending} className="btn-primary w-full justify-center">
            {createWizard.isPending ? 'Running Wizard...' : 'Create Customer, Site, Service, Device & Sync Billing'}
          </button>
        </div>
      </div>
    </div>
  )
}
