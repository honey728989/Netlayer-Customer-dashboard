import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { customersApi, type CustomerCreatePayload } from '@netlayer/api'

const defaultState: CustomerCreatePayload = {
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

export function AdminCustomerOnboardingPage() {
  const [form, setForm] = useState<CustomerCreatePayload>(defaultState)
  const [error, setError] = useState<string>('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const createCustomer = useMutation({
    mutationFn: (payload: CustomerCreatePayload) => customersApi.create(payload),
    onSuccess: async (customer) => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] })
      navigate(`/noc/customers/${customer.id}`)
    },
    onError: (mutationError: any) => {
      setError(mutationError?.response?.data?.message ?? 'Failed to create customer')
    },
  })

  const updateField = <K extends keyof CustomerCreatePayload>(key: K, value: CustomerCreatePayload[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = () => {
    setError('')
    if (!form.name.trim() || !form.accountManager.trim() || !form.portalAdminEmail.trim() || !form.portalAdminFullName.trim()) {
      setError('Customer name, account manager, portal admin name, and portal admin email are required.')
      return
    }

    createCustomer.mutate({
      ...form,
      code: form.code?.trim() || undefined,
      industry: form.industry?.trim() || undefined,
      billingEmail: form.billingEmail?.trim() || undefined,
      primaryContactName: form.primaryContactName?.trim() || undefined,
      primaryContactPhone: form.primaryContactPhone?.trim() || undefined,
      primaryContactEmail: form.primaryContactEmail?.trim() || undefined,
      zohoCustomerId: form.zohoCustomerId?.trim() || undefined,
      gstin: form.gstin?.trim() || undefined,
      portalAdminEmail: form.portalAdminEmail.trim().toLowerCase(),
      portalAdminFullName: form.portalAdminFullName.trim(),
    })
  }

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-dim">Admin Onboarding</p>
          <h1 className="font-display text-2xl font-bold text-white">Create Customer</h1>
          <p className="mt-1 text-xs text-muted">Provision a customer profile, finance mapping, and initial customer portal admin.</p>
        </div>
        <Link to="/noc/customers" className="btn-ghost">Back to Customers</Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-[color:var(--status-offline)] bg-[color:color-mix(in_srgb,var(--status-offline)_10%,transparent)] px-4 py-3 text-sm text-[color:var(--status-offline)]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="font-display text-sm font-semibold text-white">Customer Profile</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input className="input-field" placeholder="Customer name" value={form.name} onChange={(e) => updateField('name', e.target.value)} />
              <input className="input-field" placeholder="Customer code (optional)" value={form.code ?? ''} onChange={(e) => updateField('code', e.target.value)} />
              <select className="input-field" value={form.tier} onChange={(e) => updateField('tier', e.target.value)}>
                <option value="ENTERPRISE">Enterprise</option>
                <option value="BUSINESS">Business</option>
              </select>
              <input className="input-field" placeholder="Industry" value={form.industry ?? ''} onChange={(e) => updateField('industry', e.target.value)} />
              <input className="input-field" placeholder="Account manager" value={form.accountManager} onChange={(e) => updateField('accountManager', e.target.value)} />
              <select className="input-field" value={form.slaProfile} onChange={(e) => updateField('slaProfile', e.target.value)}>
                <option value="PLATINUM">Platinum</option>
                <option value="GOLD">Gold</option>
                <option value="SILVER">Silver</option>
              </select>
              <input className="input-field" placeholder="GSTIN" value={form.gstin ?? ''} onChange={(e) => updateField('gstin', e.target.value)} />
              <input className="input-field" placeholder="Zoho customer ID" value={form.zohoCustomerId ?? ''} onChange={(e) => updateField('zohoCustomerId', e.target.value)} />
            </div>
          </div>

          <div className="card p-4">
            <h2 className="font-display text-sm font-semibold text-white">Commercial & Contacts</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input className="input-field" placeholder="Billing email" value={form.billingEmail ?? ''} onChange={(e) => updateField('billingEmail', e.target.value)} />
              <input className="input-field" placeholder="Primary contact name" value={form.primaryContactName ?? ''} onChange={(e) => updateField('primaryContactName', e.target.value)} />
              <input className="input-field" placeholder="Primary contact email" value={form.primaryContactEmail ?? ''} onChange={(e) => updateField('primaryContactEmail', e.target.value)} />
              <input className="input-field" placeholder="Primary contact phone" value={form.primaryContactPhone ?? ''} onChange={(e) => updateField('primaryContactPhone', e.target.value)} />
              <input className="input-field" type="number" placeholder="Monthly recurring revenue" value={form.monthlyRecurringRevenue ?? 0} onChange={(e) => updateField('monthlyRecurringRevenue', Number(e.target.value))} />
              <input className="input-field" type="number" placeholder="Annual contract value" value={form.annualContractValue ?? 0} onChange={(e) => updateField('annualContractValue', Number(e.target.value))} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="font-display text-sm font-semibold text-white">Portal Admin User</h2>
            <div className="mt-4 space-y-3">
              <input className="input-field" placeholder="Admin full name" value={form.portalAdminFullName} onChange={(e) => updateField('portalAdminFullName', e.target.value)} />
              <input className="input-field" placeholder="Admin email" value={form.portalAdminEmail} onChange={(e) => updateField('portalAdminEmail', e.target.value)} />
              <input className="input-field" placeholder="Temporary password" value={form.portalAdminPassword} onChange={(e) => updateField('portalAdminPassword', e.target.value)} />
            </div>
            <div className="mt-4 rounded-lg border border-border bg-surface-2 p-3 text-xs text-muted">
              Is phase me customer profile ke saath ek initial `ENTERPRISE_ADMIN` user create hoga. Sites, Zabbix, Grafana, aur billing site mappings next phases me aayenge.
            </div>
          </div>

          <button onClick={handleSubmit} disabled={createCustomer.isPending} className="btn-primary w-full justify-center">
            {createCustomer.isPending ? 'Creating Customer...' : 'Create Customer & Portal Admin'}
          </button>
        </div>
      </div>
    </div>
  )
}
