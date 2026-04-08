import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { leadsApi, type Lead } from '@netlayer/api'

const STAGES = ['ALL', 'QUALIFICATION', 'FEASIBILITY', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']

export function AdminLeadsPage() {
  const [stage, setStage] = useState('ALL')
  const queryClient = useQueryClient()

  const { data: stats } = useQuery({
    queryKey: ['admin', 'leads', 'stats'],
    queryFn: () => leadsApi.getStats(),
  })

  const { data: leads = [] } = useQuery({
    queryKey: ['admin', 'leads', stage],
    queryFn: () => leadsApi.list(stage === 'ALL' ? undefined : { stage }),
  })

  const updateLead = useMutation({
    mutationFn: ({ id, nextStage }: { id: string; nextStage: string }) => leadsApi.update(id, { stage: nextStage }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'leads'] })
    },
  })

  const stageSummary = useMemo(
    () => STAGES.slice(1).map((entry) => ({ label: entry, value: leads.filter((lead: Lead) => lead.stage === entry).length })),
    [leads],
  )

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Sales & Lead Pipeline</h1>
          <p className="mt-1 text-xs text-muted">
            {(stats?.total ?? leads.length)} active opportunities · ₹{Number(stats?.expectedRevenue ?? 0).toLocaleString('en-IN')} projected
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-6">
        {stageSummary.map((entry) => (
          <button
            key={entry.label}
            onClick={() => setStage(entry.label)}
            className={stage === entry.label ? 'card border-brand px-3 py-3 text-left' : 'card px-3 py-3 text-left'}
          >
            <p className="font-mono text-lg font-bold text-white">{entry.value}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted">{entry.label}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {STAGES.map((entry) => (
          <button
            key={entry}
            onClick={() => setStage(entry)}
            className={stage === entry ? 'filter-tab-active' : 'filter-tab'}
          >
            {entry === 'ALL' ? 'All Stages' : entry}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
              <tr>
                <th className="table-th">Company</th>
                <th className="table-th">Commercials</th>
                <th className="table-th">Partner</th>
                <th className="table-th">Stage</th>
                <th className="table-th">Next Action</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead: Lead) => (
                <tr key={lead.id} className="table-row">
                  <td className="table-td">
                    <p className="font-medium text-xs text-white">{lead.company_name ?? lead.companyName ?? 'Lead'}</p>
                    <p className="font-mono text-[10px] text-dim">
                      {(lead.service_type ?? lead.serviceType ?? 'ILL')} · {(lead.city ?? 'NA')} · {(lead.bandwidth_required_mbps ?? lead.bandwidth_mbps ?? 0)} Mbps
                    </p>
                  </td>
                  <td className="table-td font-mono text-xs text-muted">
                    ₹{Number(lead.expected_value ?? lead.expected_mrc ?? 0).toLocaleString('en-IN')}
                  </td>
                  <td className="table-td text-xs text-muted">{lead.partner_name ?? 'Direct'}</td>
                  <td className="table-td">
                    <span className="inline-flex rounded px-2 py-1 text-[10px] font-mono" style={{ backgroundColor: 'var(--bg-surface-2)' }}>
                      {lead.stage}
                    </span>
                  </td>
                  <td className="table-td">
                    <select
                      value={lead.stage}
                      onChange={(event) => updateLead.mutate({ id: lead.id, nextStage: event.target.value })}
                      className="input-field h-8 min-w-[10rem] py-0 text-xs"
                    >
                      {STAGES.slice(1).map((entry) => (
                        <option key={entry} value={entry}>{entry}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-muted">No leads in this stage</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
