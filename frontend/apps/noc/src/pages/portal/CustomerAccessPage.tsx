import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@netlayer/auth'
import {
  customersApi,
  sitesApi,
  type CustomerContact,
  type CustomerPortalUser,
  type CustomerPortalUserPayload,
  type CustomerSiteAccessRow,
  type CustomerSiteGroup,
  type Site,
} from '@netlayer/api'
import { Card, EmptyState, ErrorState, KpiCard, PageHeader, StatusPill } from '@netlayer/ui'

interface FormState {
  email: string
  fullName: string
  password: string
  role: 'ENTERPRISE_ADMIN' | 'ENTERPRISE_USER'
  scopeMode: 'ALL_SITES' | 'SELECTED_SITES'
  accessLevel: string
  siteIds: string[]
  isActive: boolean
}

const accessPresets: Array<{
  label: string
  role: FormState['role']
  accessLevel: string
  scopeMode: FormState['scopeMode']
  description: string
}> = [
  {
    label: 'Enterprise Admin',
    role: 'ENTERPRISE_ADMIN',
    accessLevel: 'OPERATIONS',
    scopeMode: 'ALL_SITES',
    description: 'Full customer portfolio access for the main customer admin.',
  },
  {
    label: 'Finance User',
    role: 'ENTERPRISE_USER',
    accessLevel: 'FINANCE',
    scopeMode: 'ALL_SITES',
    description: 'Billing, invoices, and collections visibility across the account.',
  },
  {
    label: 'Branch Manager',
    role: 'ENTERPRISE_USER',
    accessLevel: 'OPERATIONS',
    scopeMode: 'SELECTED_SITES',
    description: 'Operational control for selected branch or city sites only.',
  },
  {
    label: 'View Only',
    role: 'ENTERPRISE_USER',
    accessLevel: 'VIEW',
    scopeMode: 'SELECTED_SITES',
    description: 'Read-only visibility for assigned sites and shared reports.',
  },
]

const defaultFormState: FormState = {
  email: '',
  fullName: '',
  password: 'Customer@123',
  role: 'ENTERPRISE_USER',
  scopeMode: 'ALL_SITES',
  accessLevel: 'OPERATIONS',
  siteIds: [],
  isActive: true,
}

function buildPayload(form: FormState, includePassword: boolean): CustomerPortalUserPayload {
  return {
    email: form.email.trim().toLowerCase(),
    fullName: form.fullName.trim(),
    password: includePassword ? form.password : undefined,
    role: form.role,
    scopeMode: form.scopeMode,
    accessLevels: form.accessLevel ? [form.accessLevel] : [],
    siteIds: form.scopeMode === 'SELECTED_SITES' ? form.siteIds : [],
    isActive: form.isActive,
  }
}

export function CustomerAccessPage() {
  const { user } = useAuthStore()
  const customerId = user?.customerId ?? user?.organizationId ?? ''
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(defaultFormState)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [passwordResetUserId, setPasswordResetUserId] = useState<string | null>(null)
  const [temporaryPassword, setTemporaryPassword] = useState('Customer@123')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const { data: portalUsers = [], isLoading: usersLoading, isError: usersError, refetch: refetchUsers } = useQuery({
    queryKey: ['customers', customerId, 'portal-users'],
    queryFn: () => customersApi.getPortalUsers(customerId),
    enabled: Boolean(customerId),
    staleTime: 30_000,
  })

  const { data: siteGroups = [] } = useQuery({
    queryKey: ['customers', customerId, 'site-groups'],
    queryFn: () => customersApi.getSiteGroups(customerId),
    enabled: Boolean(customerId),
    staleTime: 30_000,
  })

  const { data: siteAccess = [] } = useQuery({
    queryKey: ['customers', customerId, 'site-access'],
    queryFn: () => customersApi.getSiteAccess(customerId),
    enabled: Boolean(customerId),
    staleTime: 30_000,
  })

  const { data: contacts = [] } = useQuery({
    queryKey: ['customers', customerId, 'contacts'],
    queryFn: () => customersApi.getContacts(customerId),
    enabled: Boolean(customerId),
    staleTime: 30_000,
  })

  const { data: sitesResponse } = useQuery({
    queryKey: ['sites', 'list', customerId, 'access-page'],
    queryFn: () => sitesApi.list({ customerId, pageSize: 100 }),
    enabled: Boolean(customerId),
    staleTime: 30_000,
  })

  const sites = useMemo(() => ((Array.isArray(sitesResponse) ? sitesResponse : sitesResponse?.data ?? []) as Site[]), [sitesResponse])
  const editingUser = useMemo(
    () => (portalUsers as CustomerPortalUser[]).find((item) => item.id === editingUserId) ?? null,
    [editingUserId, portalUsers],
  )

  useEffect(() => {
    if (!editingUser) return

    const scopedSiteIds = sites
      .filter((site) => editingUser.siteNames.includes(site.name))
      .map((site) => site.id)

    setForm({
      email: editingUser.email,
      fullName: editingUser.fullName,
      password: 'Customer@123',
      role: editingUser.roles.includes('ENTERPRISE_ADMIN') ? 'ENTERPRISE_ADMIN' : 'ENTERPRISE_USER',
      scopeMode: editingUser.scopeMode,
      accessLevel: editingUser.accessLevels[0] ?? 'OPERATIONS',
      siteIds: scopedSiteIds,
      isActive: editingUser.isActive,
    })
  }, [editingUser, sites])

  const stats = useMemo(() => {
    const users = portalUsers as CustomerPortalUser[]
    return {
      admins: users.filter((item) => item.roles.includes('ENTERPRISE_ADMIN')).length,
      scoped: users.filter((item) => item.scopeMode === 'SELECTED_SITES').length,
      finance: users.filter((item) => item.accessProfile === 'Finance User').length,
      operations: users.filter((item) => item.accessProfile === 'Operations User' || item.accessProfile === 'Branch Manager').length,
    }
  }, [portalUsers])

  const groupedContacts = useMemo(() => {
    const allContacts = contacts as CustomerContact[]
    return {
      billing: allContacts.filter((contact) => (contact.contact_type ?? contact.contactType ?? contact.role ?? '').toUpperCase().includes('BILL')),
      technical: allContacts.filter((contact) => {
        const token = (contact.contact_type ?? contact.contactType ?? contact.role ?? '').toUpperCase()
        return token.includes('TECH') || token.includes('OPS') || token.includes('NETWORK') || token.includes('IT')
      }),
      escalation: allContacts.filter((contact) => {
        const token = (contact.contact_type ?? contact.contactType ?? contact.role ?? '').toUpperCase()
        return token.includes('ESCALATION') || Boolean(contact.is_primary ?? contact.isPrimary)
      }),
    }
  }, [contacts])
  const selectedGroupSummaries = useMemo(
    () =>
      (siteGroups as CustomerSiteGroup[]).map((group) => ({
        ...group,
        siteIds: sites.filter((site) => group.siteNames.includes(site.name)).map((site) => site.id),
      })),
    [siteGroups, sites],
  )

  const refreshAccessWorkspace = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'portal-users'] }),
      queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'site-access'] }),
    ])
  }

  const createUserMutation = useMutation({
    mutationFn: (payload: CustomerPortalUserPayload) => customersApi.createPortalUser(customerId, payload),
    onSuccess: async () => {
      await refreshAccessWorkspace()
      setFeedback({ type: 'success', message: 'Customer portal user created successfully.' })
      setForm(defaultFormState)
    },
    onError: (error: any) => {
      setFeedback({ type: 'error', message: error?.response?.data?.message ?? 'Failed to create portal user.' })
    },
  })

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: Partial<CustomerPortalUserPayload> }) =>
      customersApi.updatePortalUser(customerId, userId, payload),
    onSuccess: async () => {
      await refreshAccessWorkspace()
      setFeedback({ type: 'success', message: 'Customer portal user updated successfully.' })
      setEditingUserId(null)
      setForm(defaultFormState)
    },
    onError: (error: any) => {
      setFeedback({ type: 'error', message: error?.response?.data?.message ?? 'Failed to update portal user.' })
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      customersApi.resetPortalUserPassword(customerId, userId, password),
    onSuccess: async () => {
      await refreshAccessWorkspace()
      setFeedback({ type: 'success', message: 'Portal user password reset successfully.' })
      setPasswordResetUserId(null)
      setTemporaryPassword('Customer@123')
    },
    onError: (error: any) => {
      setFeedback({ type: 'error', message: error?.response?.data?.message ?? 'Failed to reset password.' })
    },
  })

  const handleSubmit = () => {
    setFeedback(null)
    if (!form.email.trim() || !form.fullName.trim()) {
      setFeedback({ type: 'error', message: 'Full name and email are required.' })
      return
    }
    if (!editingUserId && !form.password.trim()) {
      setFeedback({ type: 'error', message: 'Password is required for new users.' })
      return
    }
    if (form.scopeMode === 'SELECTED_SITES' && form.siteIds.length === 0) {
      setFeedback({ type: 'error', message: 'Select at least one site for scoped users.' })
      return
    }

    if (editingUserId) {
      updateUserMutation.mutate({
        userId: editingUserId,
        payload: buildPayload(form, false),
      })
      return
    }

    createUserMutation.mutate(buildPayload(form, true))
  }

  const handleQuickToggle = (portalUser: CustomerPortalUser) => {
    setFeedback(null)
    updateUserMutation.mutate({
      userId: portalUser.id,
      payload: {
        fullName: portalUser.fullName,
        role: portalUser.roles.includes('ENTERPRISE_ADMIN') ? 'ENTERPRISE_ADMIN' : 'ENTERPRISE_USER',
        scopeMode: portalUser.scopeMode,
        accessLevels: portalUser.accessLevels,
        siteIds: sites.filter((site) => portalUser.siteNames.includes(site.name)).map((site) => site.id),
        isActive: !portalUser.isActive,
      },
    })
  }

  const applyPreset = (preset: (typeof accessPresets)[number]) => {
    setFeedback(null)
    setForm((current) => ({
      ...current,
      role: preset.role,
      accessLevel: preset.accessLevel,
      scopeMode: preset.scopeMode,
      siteIds: preset.scopeMode === 'ALL_SITES' ? [] : current.siteIds,
    }))
  }

  const applySiteGroup = (groupId: string) => {
    const group = selectedGroupSummaries.find((item) => item.id === groupId)
    if (!group) return

    setFeedback(null)
    setForm((current) => ({
      ...current,
      scopeMode: 'SELECTED_SITES',
      siteIds: Array.from(new Set(group.siteIds)),
    }))
  }

  const prefillFromContact = (contact: CustomerContact, accessLevel: string, scopeMode: FormState['scopeMode']) => {
    setFeedback(null)
    setEditingUserId(null)
    setForm((current) => ({
      ...current,
      fullName: contact.name,
      email: contact.email ?? '',
      accessLevel,
      scopeMode,
      role: accessLevel === 'FINANCE' ? 'ENTERPRISE_USER' : current.role,
      siteIds: scopeMode === 'ALL_SITES' ? [] : current.siteIds,
    }))
  }

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <PageHeader
        title="Access Controls"
        subtitle="Manage customer sub-users, branch access, finance visibility, and site-scoped portal permissions."
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

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="Customer Admins" value={stats.admins} loading={usersLoading} accentColor="var(--brand)" />
        <KpiCard label="Scoped Users" value={stats.scoped} loading={usersLoading} accentColor="var(--status-degraded)" />
        <KpiCard label="Finance Users" value={stats.finance} loading={usersLoading} accentColor="var(--status-info)" />
        <KpiCard label="Ops / Branch Users" value={stats.operations} loading={usersLoading} accentColor="var(--status-online)" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card title={editingUserId ? 'Edit Portal User' : 'Add Portal User'}>
          <div className="mb-4 grid gap-2 md:grid-cols-2">
            {accessPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="rounded-lg border border-border bg-surface-2 px-3 py-3 text-left transition-colors hover:bg-surface-3"
                onClick={() => applyPreset(preset)}
              >
                <p className="text-xs font-semibold text-white">{preset.label}</p>
                <p className="mt-1 text-[11px] text-dim">{preset.description}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-[11px] text-muted">
              Full Name
              <input className="input-field mt-1" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
            </label>
            <label className="text-[11px] text-muted">
              Email
              <input className="input-field mt-1" type="email" value={form.email} disabled={Boolean(editingUserId)} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </label>
            {!editingUserId ? (
              <label className="text-[11px] text-muted">
                Initial Password
                <input className="input-field mt-1" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
              </label>
            ) : (
              <div className="rounded-lg border border-border bg-surface-2 px-3 py-3 text-[11px] text-dim">
                Existing users keep their current password. Reset flow can be added later from the finance/admin workspace.
              </div>
            )}
            <label className="text-[11px] text-muted">
              Role
              <select className="input-field mt-1" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as FormState['role'] }))}>
                <option value="ENTERPRISE_USER">Enterprise User</option>
                <option value="ENTERPRISE_ADMIN">Enterprise Admin</option>
              </select>
            </label>
            <label className="text-[11px] text-muted">
              Access Level
              <select className="input-field mt-1" value={form.accessLevel} onChange={(event) => setForm((current) => ({ ...current, accessLevel: event.target.value }))}>
                <option value="OPERATIONS">Operations</option>
                <option value="FINANCE">Finance</option>
                <option value="VIEW">View Only</option>
              </select>
            </label>
            <label className="text-[11px] text-muted">
              Scope Mode
              <select className="input-field mt-1" value={form.scopeMode} onChange={(event) => setForm((current) => ({ ...current, scopeMode: event.target.value as FormState['scopeMode'] }))}>
                <option value="ALL_SITES">All Sites</option>
                <option value="SELECTED_SITES">Selected Sites</option>
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-3 text-[11px] text-muted">
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
              User is active and can log in
            </label>
          </div>

          {form.scopeMode === 'SELECTED_SITES' && selectedGroupSummaries.length > 0 ? (
            <div className="mt-4 rounded-lg border border-border bg-surface-2 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-white">Quick Site Group Scope</p>
                <span className="text-[10px] text-dim">Apply a region or branch group to prefill site assignments.</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedGroupSummaries.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    className="rounded-full border border-border px-2.5 py-1 text-[10px] text-dim transition-colors hover:bg-surface-3"
                    onClick={() => applySiteGroup(group.id)}
                  >
                    {group.name} · {group.memberCount}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {form.scopeMode === 'SELECTED_SITES' ? (
            <div className="mt-4 rounded-lg border border-border bg-surface-2 p-3">
              <p className="text-[11px] font-semibold text-white">Assigned Sites</p>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                {sites.map((site) => (
                  <label key={site.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-[11px] text-dim">
                    <input
                      type="checkbox"
                      checked={form.siteIds.includes(site.id)}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          siteIds: event.target.checked
                            ? [...current.siteIds, site.id]
                            : current.siteIds.filter((siteId) => siteId !== site.id),
                        }))
                      }
                    />
                    <span>{site.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={createUserMutation.isPending || updateUserMutation.isPending}
              onClick={handleSubmit}
            >
              {editingUserId ? 'Save Changes' : 'Create User'}
            </button>
            {editingUserId ? (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setEditingUserId(null)
                  setForm(defaultFormState)
                  setFeedback(null)
                }}
              >
                Cancel Edit
              </button>
            ) : null}
            {passwordResetUserId ? (
              <>
                <input
                  className="input-field max-w-56"
                  value={temporaryPassword}
                  onChange={(event) => setTemporaryPassword(event.target.value)}
                  placeholder="Temporary password"
                />
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={resetPasswordMutation.isPending || temporaryPassword.trim().length < 8}
                  onClick={() => resetPasswordMutation.mutate({ userId: passwordResetUserId, password: temporaryPassword })}
                >
                  {resetPasswordMutation.isPending ? 'Resetting...' : 'Confirm Reset'}
                </button>
                <button type="button" className="btn-ghost" onClick={() => setPasswordResetUserId(null)}>
                  Cancel Reset
                </button>
              </>
            ) : null}
          </div>
        </Card>

        <div className="space-y-5">
          <Card title="Access Buckets">
            <div className="space-y-3 text-[11px]">
              {[
                { label: 'Billing & Collections', items: groupedContacts.billing, empty: 'No billing contacts mapped yet.' },
                { label: 'Operations & NOC', items: groupedContacts.technical, empty: 'No operations contacts mapped yet.' },
                { label: 'Escalation Matrix', items: groupedContacts.escalation, empty: 'No escalation contacts mapped yet.' },
              ].map((section) => (
                <div key={section.label} className="rounded-lg border border-border bg-surface-2 p-3">
                  <p className="font-semibold text-white">{section.label}</p>
                  <div className="mt-2 space-y-2">
                    {section.items.length === 0 ? (
                      <p className="text-muted">{section.empty}</p>
                    ) : (
                      section.items.slice(0, 3).map((contact) => (
                        <div key={contact.id} className="rounded-md bg-surface px-3 py-2">
                          <p className="text-white">{contact.name}</p>
                          <p className="mt-0.5 text-dim">{contact.email ?? contact.phone ?? contact.role ?? contact.designation ?? 'Mapped contact'}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="btn-ghost py-1 text-[10px]"
                              onClick={() =>
                                prefillFromContact(
                                  contact,
                                  section.label === 'Billing & Collections' ? 'FINANCE' : 'OPERATIONS',
                                  section.label === 'Escalation Matrix' ? 'ALL_SITES' : 'SELECTED_SITES',
                                )
                              }
                            >
                              Use for New User
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Site Groups">
            {(siteGroups as CustomerSiteGroup[]).length === 0 ? (
              <EmptyState title="No site groups" description="Manual and auto-generated site groups will appear here for branch and region scoping." />
            ) : (
              <div className="space-y-3">
                {(siteGroups as CustomerSiteGroup[]).map((group) => (
                  <div key={group.id} className="rounded-lg border border-border bg-surface-2 p-3 text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-white">{group.name}</p>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-dim">{group.groupType}</span>
                    </div>
                    <p className="mt-1 text-muted">{group.description ?? 'Grouped access bucket'}</p>
                    <p className="mt-2 text-dim">{group.memberCount} site(s)</p>
                    <p className="mt-1 text-muted">
                      {group.siteNames.slice(0, 3).join(', ')}
                      {group.siteNames.length > 3 ? ` +${group.siteNames.length - 3} more` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Card title="Portal Users">
        {usersError ? (
          <ErrorState message="Failed to load portal users." onRetry={() => void refetchUsers()} />
        ) : usersLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton h-20 rounded-md" />
            ))}
          </div>
        ) : (portalUsers as CustomerPortalUser[]).length === 0 ? (
          <EmptyState title="No customer users found" description="Portal users will appear here once customer accounts are provisioned." />
        ) : (
          <div className="space-y-3">
            {(portalUsers as CustomerPortalUser[]).map((portalUser) => (
              <div key={portalUser.id} className="rounded-lg border border-border bg-surface-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{portalUser.fullName}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{portalUser.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={portalUser.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    <button type="button" className="btn-ghost py-1 text-[11px]" onClick={() => setEditingUserId(portalUser.id)}>
                      Edit
                    </button>
                    <button type="button" className="btn-ghost py-1 text-[11px]" onClick={() => setPasswordResetUserId(portalUser.id)}>
                      Reset Password
                    </button>
                    <button type="button" className="btn-ghost py-1 text-[11px]" onClick={() => handleQuickToggle(portalUser)}>
                      {portalUser.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-border px-2.5 py-1 text-[10px] text-white">
                    {portalUser.accessProfile}
                  </span>
                  <span className="rounded-full border border-border px-2.5 py-1 text-[10px] text-dim">
                    {portalUser.scopeMode === 'ALL_SITES' ? 'All Sites' : `${portalUser.assignedSites} Assigned Sites`}
                  </span>
                  {portalUser.roles.map((role) => (
                    <span key={role} className="rounded-full border border-border px-2.5 py-1 text-[10px] text-dim">
                      {role}
                    </span>
                  ))}
                </div>

                {portalUser.siteNames.length > 0 ? (
                  <p className="mt-3 text-[11px] text-muted">
                    Site scope: {portalUser.siteNames.slice(0, 4).join(', ')}
                    {portalUser.siteNames.length > 4 ? ` +${portalUser.siteNames.length - 4} more` : ''}
                  </p>
                ) : (
                  <p className="mt-3 text-[11px] text-muted">Has access to the full customer portfolio.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Site Access Matrix">
        {(siteAccess as CustomerSiteAccessRow[]).length === 0 ? (
          <EmptyState title="No scoped site access" description="Scoped customer users will appear here once site assignments are configured." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
                <tr>
                  <th className="table-th">Site</th>
                  <th className="table-th">Location</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Assigned Users</th>
                </tr>
              </thead>
              <tbody>
                {(siteAccess as CustomerSiteAccessRow[]).map((row) => (
                  <tr key={row.siteId} className="table-row">
                    <td className="table-td">
                      <div>
                        <p className="text-xs font-semibold text-white">{row.siteName}</p>
                        <p className="text-[11px] text-dim">{row.assignments.length} scoped assignment(s)</p>
                      </div>
                    </td>
                    <td className="table-td text-xs text-muted">{row.city ?? '--'}</td>
                    <td className="table-td">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="table-td">
                      {row.assignments.length === 0 ? (
                        <span className="text-[11px] text-muted">Covered by all-site customer admins</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {row.assignments.map((assignment) => (
                            <span key={`${row.siteId}-${assignment.userId}`} className="rounded-full border border-border px-2.5 py-1 text-[10px] text-dim">
                              {assignment.fullName} - {assignment.accessLevel}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
