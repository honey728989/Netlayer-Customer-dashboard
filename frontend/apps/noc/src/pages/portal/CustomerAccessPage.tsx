import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@netlayer/auth'
import { customersApi, type CustomerContact, type CustomerPortalUser, type CustomerSiteAccessRow, type CustomerSiteGroup } from '@netlayer/api'
import { Card, EmptyState, ErrorState, KpiCard, PageHeader, StatusPill } from '@netlayer/ui'

export function CustomerAccessPage() {
  const { user } = useAuthStore()
  const customerId = user?.customerId ?? user?.organizationId ?? ''

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

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <PageHeader
        title="Access Controls"
        subtitle="Manage how customer users, branches, finance, and operations teams are mapped across your site portfolio."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="Customer Admins" value={stats.admins} loading={usersLoading} accentColor="var(--brand)" />
        <KpiCard label="Scoped Users" value={stats.scoped} loading={usersLoading} accentColor="var(--status-degraded)" />
        <KpiCard label="Finance Users" value={stats.finance} loading={usersLoading} accentColor="var(--status-info)" />
        <KpiCard label="Ops / Branch Users" value={stats.operations} loading={usersLoading} accentColor="var(--status-online)" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
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
                    <StatusPill status={portalUser.isActive ? 'ACTIVE' : 'INACTIVE'} />
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
                              {assignment.fullName} • {assignment.accessLevel}
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
