import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@netlayer/auth'
import { customersApi, type CustomerContactPayload } from '@netlayer/api'
import { Card, EmptyState, ErrorState, PageHeader } from '@netlayer/ui'

export function CustomerSettingsPage() {
  const { user } = useAuthStore()
  const customerId = user?.customerId ?? user?.organizationId ?? ''
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const { data: profile, isLoading: profileLoading, isError: profileError, refetch: refetchProfile } = useQuery({
    queryKey: ['customers', customerId, 'profile'],
    queryFn: () => customersApi.getProfile(customerId),
    enabled: Boolean(customerId),
    staleTime: 30_000,
  })

  const { data: contacts = [] } = useQuery({
    queryKey: ['customers', customerId, 'contacts'],
    queryFn: () => customersApi.getContacts(customerId),
    enabled: Boolean(customerId),
    staleTime: 30_000,
  })

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['customers', customerId, 'audit-logs'],
    queryFn: () => customersApi.getAuditLogs(customerId),
    enabled: Boolean(customerId),
    staleTime: 30_000,
  })

  const [profileForm, setProfileForm] = useState({
    name: '',
    industry: '',
    billingEmail: '',
    primaryContactName: '',
    primaryContactPhone: '',
  })
  const [contactsForm, setContactsForm] = useState<CustomerContactPayload[]>([])

  useEffect(() => {
    if (profile && !profileForm.name) {
      setProfileForm({
        name: profile.name ?? '',
        industry: profile.industry ?? '',
        billingEmail: profile.billingEmail ?? '',
        primaryContactName: profile.primaryContactName ?? '',
        primaryContactPhone: profile.primaryContactPhone ?? '',
      })
    }
  }, [profile, profileForm.name])

  useEffect(() => {
    if (contacts.length > 0 && contactsForm.length === 0) {
      setContactsForm(
        contacts.map((contact) => ({
          id: contact.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          role: contact.role,
          designation: contact.designation,
          isPrimary: contact.is_primary ?? contact.isPrimary,
          contactType: contact.contact_type ?? contact.contactType,
        })),
      )
    }
  }, [contacts, contactsForm.length])

  const saveProfileMutation = useMutation({
    mutationFn: () => customersApi.updateProfile(customerId, profileForm),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'profile'] })
      setFeedback({ type: 'success', message: 'Customer profile updated successfully.' })
    },
    onError: (error: any) => {
      setFeedback({ type: 'error', message: error?.response?.data?.message ?? 'Failed to update customer profile.' })
    },
  })

  const saveContactsMutation = useMutation({
    mutationFn: () => customersApi.saveContacts(customerId, contactsForm.filter((contact) => contact.name?.trim())),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'contacts'] })
      setFeedback({ type: 'success', message: 'Customer contacts updated successfully.' })
    },
    onError: (error: any) => {
      setFeedback({ type: 'error', message: error?.response?.data?.message ?? 'Failed to update contacts.' })
    },
  })

  const addContactRow = () => {
    setContactsForm((current) => [
      ...current,
      { name: '', email: '', phone: '', role: '', designation: '', contactType: 'TECHNICAL', isPrimary: false },
    ])
  }

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <PageHeader
        title="Settings"
        subtitle="Maintain customer account profile, billing contact data, and operational escalation records."
      />

      {feedback ? (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: feedback.type === 'success' ? 'color-mix(in srgb, var(--status-online) 35%, transparent)' : 'color-mix(in srgb, var(--status-offline) 35%, transparent)',
            backgroundColor: feedback.type === 'success' ? 'color-mix(in srgb, var(--status-online) 10%, transparent)' : 'color-mix(in srgb, var(--status-offline) 10%, transparent)',
            color: feedback.type === 'success' ? 'var(--status-online)' : 'var(--status-offline)',
          }}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card title="Account Profile">
          {profileError ? (
            <ErrorState message="Failed to load customer profile." onRetry={() => void refetchProfile()} />
          ) : profileLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="skeleton h-10 rounded-md" />
              ))}
            </div>
          ) : !profile ? (
            <EmptyState title="Profile not found" description="Customer account profile is not available yet." />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-[11px] text-muted">
                  Customer Name
                  <input className="input-field mt-1" value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} />
                </label>
                <label className="text-[11px] text-muted">
                  Industry
                  <input className="input-field mt-1" value={profileForm.industry} onChange={(event) => setProfileForm((current) => ({ ...current, industry: event.target.value }))} />
                </label>
                <label className="text-[11px] text-muted">
                  Billing Email
                  <input className="input-field mt-1" value={profileForm.billingEmail} onChange={(event) => setProfileForm((current) => ({ ...current, billingEmail: event.target.value }))} />
                </label>
                <label className="text-[11px] text-muted">
                  Primary Contact Name
                  <input className="input-field mt-1" value={profileForm.primaryContactName} onChange={(event) => setProfileForm((current) => ({ ...current, primaryContactName: event.target.value }))} />
                </label>
                <label className="text-[11px] text-muted">
                  Primary Contact Phone
                  <input className="input-field mt-1" value={profileForm.primaryContactPhone} onChange={(event) => setProfileForm((current) => ({ ...current, primaryContactPhone: event.target.value }))} />
                </label>
                <div className="rounded-lg border border-border bg-surface-2 px-3 py-3 text-[11px] text-dim">
                  <p>SLA Profile: {profile.slaProfile ?? '--'}</p>
                  <p className="mt-1">Account Manager: {profile.accountManager ?? '--'}</p>
                  <p className="mt-1">Contract End: {profile.contractEndDate ? new Date(profile.contractEndDate).toLocaleDateString('en-IN') : '--'}</p>
                </div>
              </div>
              <button type="button" className="btn-primary" disabled={saveProfileMutation.isPending} onClick={() => saveProfileMutation.mutate()}>
                {saveProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          )}
        </Card>

        <Card title="Commercial Snapshot">
          {profileLoading || !profile ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="skeleton h-12 rounded-md" />
              ))}
            </div>
          ) : (
            <div className="space-y-3 text-[12px]">
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Account Code</p>
                <p className="mt-1 text-white">{profile.code ?? '--'}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Monthly Recurring Revenue</p>
                <p className="mt-1 font-mono text-white">₹{Number(profile.monthlyRecurringRevenue ?? 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Annual Contract Value</p>
                <p className="mt-1 font-mono text-white">₹{Number(profile.annualContractValue ?? 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Contract Window</p>
                <p className="mt-1 text-white">
                  {profile.contractStartDate ? new Date(profile.contractStartDate).toLocaleDateString('en-IN') : '--'}
                  {' '}to{' '}
                  {profile.contractEndDate ? new Date(profile.contractEndDate).toLocaleDateString('en-IN') : '--'}
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card title="Customer Contacts">
        <div className="space-y-3">
          {contactsForm.map((contact, index) => (
            <div key={`${contact.id ?? 'new'}-${index}`} className="rounded-lg border border-border bg-surface-2 p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="text-[11px] text-muted">
                  Name
                  <input className="input-field mt-1" value={contact.name ?? ''} onChange={(event) => setContactsForm((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} />
                </label>
                <label className="text-[11px] text-muted">
                  Email
                  <input className="input-field mt-1" value={contact.email ?? ''} onChange={(event) => setContactsForm((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, email: event.target.value } : item))} />
                </label>
                <label className="text-[11px] text-muted">
                  Phone
                  <input className="input-field mt-1" value={contact.phone ?? ''} onChange={(event) => setContactsForm((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, phone: event.target.value } : item))} />
                </label>
                <label className="text-[11px] text-muted">
                  Role
                  <input className="input-field mt-1" value={contact.role ?? ''} onChange={(event) => setContactsForm((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, role: event.target.value } : item))} />
                </label>
                <label className="text-[11px] text-muted">
                  Designation
                  <input className="input-field mt-1" value={contact.designation ?? ''} onChange={(event) => setContactsForm((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, designation: event.target.value } : item))} />
                </label>
                <label className="text-[11px] text-muted">
                  Contact Type
                  <select className="input-field mt-1" value={contact.contactType ?? 'TECHNICAL'} onChange={(event) => setContactsForm((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, contactType: event.target.value } : item))}>
                    <option value="TECHNICAL">Technical</option>
                    <option value="BILLING">Billing</option>
                    <option value="ESCALATION">Escalation</option>
                    <option value="OPERATIONS">Operations</option>
                  </select>
                </label>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-[11px] text-dim">
                  <input type="checkbox" checked={Boolean(contact.isPrimary)} onChange={(event) => setContactsForm((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, isPrimary: event.target.checked } : item))} />
                  Primary contact
                </label>
                <button type="button" className="btn-ghost py-1 text-[11px]" onClick={() => setContactsForm((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost" onClick={addContactRow}>Add Contact</button>
            <button type="button" className="btn-primary" disabled={saveContactsMutation.isPending} onClick={() => saveContactsMutation.mutate()}>
              {saveContactsMutation.isPending ? 'Saving...' : 'Save Contacts'}
            </button>
          </div>
        </div>
      </Card>

      <Card title="Recent Activity">
        {auditLogs.length === 0 ? (
          <EmptyState title="No audit activity yet" description="Profile, access, and request changes will start appearing here." />
        ) : (
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="rounded-lg border border-border bg-surface-2 p-3 text-[12px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-white">{log.action}</p>
                  <p className="text-dim">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN') : '--'}
                  </p>
                </div>
                <p className="mt-1 text-muted">
                  {log.actorName ?? 'System'}{log.actorEmail ? ` (${log.actorEmail})` : ''} updated {log.entityType}.
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
