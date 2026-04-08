import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { customersApi, sitesApi, type SiteCreatePayload } from '@netlayer/api'

const defaultState: SiteCreatePayload = {
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

export function AdminSiteOnboardingPage() {
  const { customerId = '' } = useParams()
  const [form, setForm] = useState<SiteCreatePayload>(defaultState)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: customer } = useQuery({
    queryKey: ['admin', 'customer', customerId],
    queryFn: () => customersApi.getById(customerId),
    enabled: Boolean(customerId),
  })

  const createSite = useMutation({
    mutationFn: (payload: SiteCreatePayload) => sitesApi.createForCustomer(customerId, payload),
    onSuccess: async (site) => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'customer', customerId, 'sites'] })
      await queryClient.invalidateQueries({ queryKey: ['sites'] })
      navigate(`/noc/sites/${site.id}`)
    },
    onError: (mutationError: any) => {
      setError(mutationError?.response?.data?.message ?? 'Failed to create site')
    },
  })

  const updateField = <K extends keyof SiteCreatePayload>(key: K, value: SiteCreatePayload[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = () => {
    setError('')
    if (!form.name.trim() || !form.region.trim() || !form.address.trim()) {
      setError('Site name, region, and address are required.')
      return
    }
    createSite.mutate({
      ...form,
      code: form.code?.trim() || undefined,
      city: form.city?.trim() || undefined,
      state: form.state?.trim() || undefined,
      ipBlock: form.ipBlock?.trim() || undefined,
      pop: form.pop?.trim() || undefined,
      lastMileProvider: form.lastMileProvider?.trim() || undefined,
      dashboardUid: form.dashboardUid?.trim() || undefined,
      goLiveDate: form.goLiveDate?.trim() || undefined,
      contractEndDate: form.contractEndDate?.trim() || undefined,
    })
  }

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-dim">Site Provisioning</p>
          <h1 className="font-display text-2xl font-bold text-white">Add Customer Site</h1>
          <p className="mt-1 text-xs text-muted">
            {customer?.name ?? 'Customer'} ke under physical site / branch create karo. Next phases me isi site par Zabbix, Grafana, aur billing mapping hogi.
          </p>
        </div>
        <Link to={`/noc/customers/${customerId}`} className="btn-ghost">Back to Customer</Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-[color:var(--status-offline)] bg-[color:color-mix(in_srgb,var(--status-offline)_10%,transparent)] px-4 py-3 text-sm text-[color:var(--status-offline)]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="font-display text-sm font-semibold text-white">Core Site Profile</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input className="input-field" placeholder="Site name" value={form.name} onChange={(e) => updateField('name', e.target.value)} />
              <input className="input-field" placeholder="Site code (optional)" value={form.code ?? ''} onChange={(e) => updateField('code', e.target.value)} />
              <input className="input-field" placeholder="Region" value={form.region} onChange={(e) => updateField('region', e.target.value)} />
              <select className="input-field" value={form.status ?? 'UP'} onChange={(e) => updateField('status', e.target.value)}>
                <option value="UP">UP</option>
                <option value="DOWN">DOWN</option>
                <option value="DEGRADED">DEGRADED</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
              <input className="input-field" placeholder="City" value={form.city ?? ''} onChange={(e) => updateField('city', e.target.value)} />
              <input className="input-field" placeholder="State" value={form.state ?? ''} onChange={(e) => updateField('state', e.target.value)} />
              <textarea className="input-field min-h-[110px] md:col-span-2" placeholder="Full address" value={form.address} onChange={(e) => updateField('address', e.target.value)} />
            </div>
          </div>

          <div className="card p-4">
            <h2 className="font-display text-sm font-semibold text-white">Connectivity Metadata</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input className="input-field" placeholder="POP" value={form.pop ?? ''} onChange={(e) => updateField('pop', e.target.value)} />
              <input className="input-field" placeholder="Last mile provider" value={form.lastMileProvider ?? ''} onChange={(e) => updateField('lastMileProvider', e.target.value)} />
              <input className="input-field" placeholder="IP block" value={form.ipBlock ?? ''} onChange={(e) => updateField('ipBlock', e.target.value)} />
              <input className="input-field" placeholder="Grafana dashboard UID (optional)" value={form.dashboardUid ?? ''} onChange={(e) => updateField('dashboardUid', e.target.value)} />
              <input className="input-field" type="date" value={form.goLiveDate ?? ''} onChange={(e) => updateField('goLiveDate', e.target.value)} />
              <input className="input-field" type="date" value={form.contractEndDate ?? ''} onChange={(e) => updateField('contractEndDate', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="font-display text-sm font-semibold text-white">What this phase does</h2>
            <div className="mt-3 space-y-2 text-xs text-muted">
              <p>Creates the site under the selected customer.</p>
              <p>Saves operational metadata like POP, IP block, and last-mile provider.</p>
              <p>Stores optional Grafana dashboard UID for later graph mapping.</p>
              <p>Zabbix host and service/billing mapping next phases me attach honge.</p>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={createSite.isPending} className="btn-primary w-full justify-center">
            {createSite.isPending ? 'Creating Site...' : 'Create Site'}
          </button>
        </div>
      </div>
    </div>
  )
}
