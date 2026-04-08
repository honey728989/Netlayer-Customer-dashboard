import { useState } from 'react'
import { Plus, IndianRupee } from 'lucide-react'
import { useAuthStore } from '@netlayer/auth'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { partnersApi } from '@netlayer/api'
import type { Lead } from '@netlayer/api'

const INR = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)

function leadCompany(l: Lead) { return l.company_name ?? l.companyName ?? '—' }
function leadContact(l: Lead) { return l.contact_name ?? l.contactName ?? '' }
function leadService(l: Lead) { return l.service_type ?? l.serviceType ?? '' }
function leadBw(l: Lead)      { return l.bandwidth_required_mbps ?? l.bandwidthRequiredMbps ?? l.bandwidth_mbps ?? 0 }
function leadValue(l: Lead)   { return Number(l.expected_mrc ?? l.expected_value ?? l.estimatedValue ?? 0) }

const STAGES: Array<{ key: string; label: string; color: string }> = [
  { key: 'new',         label: 'New',         color: 'var(--brand)' },
  { key: 'qualified',   label: 'Qualified',   color: 'var(--status-info)' },
  { key: 'proposal',    label: 'Proposal',    color: 'var(--status-degraded)' },
  { key: 'negotiation', label: 'Negotiation', color: '#a855f7' },
  { key: 'won',         label: 'Won',         color: 'var(--status-online)' },
  { key: 'lost',        label: 'Lost',        color: 'var(--status-offline)' },
]

function LeadCard({ lead }: { lead: Lead }) {
  const value = leadValue(lead)
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('leadId', lead.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className="rounded-md p-3 cursor-grab active:cursor-grabbing select-none transition-colors"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-2)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{leadCompany(lead)}</p>
      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{leadContact(lead)}</p>
      <div className="mt-2 flex items-center gap-1 font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
        <IndianRupee size={9} />
        <span>{value > 0 ? INR(value) : '—'}</span>
        {leadService(lead) && (
          <span className="ml-auto rounded px-1 py-0.5 text-[9px]"
                style={{ backgroundColor: 'var(--bg-surface-3)', color: 'var(--text-dim)' }}>
            {leadService(lead)}{leadBw(lead) ? ` ${leadBw(lead)}M` : ''}
          </span>
        )}
      </div>
    </div>
  )
}

function KanbanColumn({
  stage, leads, onDrop,
}: {
  stage: (typeof STAGES)[number]
  leads: Lead[]
  onDrop: (leadId: string, stage: string) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const totalValue = leads.reduce((sum, l) => sum + leadValue(l), 0)

  return (
    <div
      className="flex w-60 shrink-0 flex-col rounded-lg transition-colors"
      style={{
        backgroundColor: isDragOver ? `color-mix(in srgb, var(--brand) 5%, var(--bg-surface))` : 'var(--bg-surface)',
        border: isDragOver ? '1px solid color-mix(in srgb, var(--brand) 40%, transparent)' : '1px solid var(--border)',
      }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setIsDragOver(true) }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false) }}
      onDrop={(e) => {
        e.preventDefault(); setIsDragOver(false)
        const id = e.dataTransfer.getData('leadId')
        if (id) onDrop(id, stage.key)
      }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between p-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full shrink-0" style={{ background: stage.color }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{stage.label}</span>
          <span className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>{leads.length}</span>
        </div>
        {totalValue > 0 && (
          <span className="font-mono text-[9px]" style={{ color: 'var(--text-muted)' }}>
            {INR(totalValue)}
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2 min-h-[120px]">
        {leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
        {leads.length === 0 && (
          <p className="py-6 text-center text-[10px] transition-colors"
             style={{ color: isDragOver ? 'var(--brand)' : 'var(--text-dim)' }}>
            {isDragOver ? 'Drop here' : 'No leads'}
          </p>
        )}
      </div>
    </div>
  )
}

export function PipelinePage() {
  const { user } = useAuthStore()
  const partnerId = user?.partnerId ?? user?.organizationId ?? ''
  const queryClient = useQueryClient()

  const { data: leadsRaw, isLoading } = useQuery({
    queryKey: ['partners', partnerId, 'leads', 'all'],
    queryFn: () => partnersApi.getLeads(partnerId, { pageSize: 200 }),
    enabled: Boolean(partnerId),
    staleTime: 30_000,
  })

  const leads = (Array.isArray(leadsRaw) ? leadsRaw : (leadsRaw as any)?.data ?? []) as Lead[]

  const { mutate: updateLead } = useMutation({
    mutationFn: ({ leadId, stage }: { leadId: string; stage: string }) =>
      partnersApi.updateLead(partnerId, leadId, { stage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners', partnerId, 'leads'] })
    },
  })

  const totalPipelineValue = leads
    .filter(l => !['won','lost'].includes((l.stage ?? '').toLowerCase()))
    .reduce((sum, l) => sum + leadValue(l), 0)

  const handleDrop = (leadId: string, stage: string) => {
    const lead = leads.find(l => l.id === leadId)
    if (lead && (lead.stage ?? '').toLowerCase() !== stage) {
      updateLead({ leadId, stage })
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="p-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Sales Pipeline</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {totalPipelineValue > 0
                ? `${INR(totalPipelineValue)} total pipeline value`
                : 'Drag cards to update deal stage'}
            </p>
          </div>
          <button className="btn-primary gap-1.5">
            <Plus size={13} /> Add Lead
          </button>
        </div>
      </div>

      {/* Stage summary strip */}
      {!isLoading && (
        <div className="flex gap-4 px-5 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
          {STAGES.map(stage => {
            const count = leads.filter(l => (l.stage ?? '').toLowerCase() === stage.key).length
            return (
              <div key={stage.key} className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: stage.color }} />
                <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{count}</span> {stage.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Kanban board */}
      <div className="flex flex-1 gap-3 overflow-x-auto p-5">
        {isLoading
          ? STAGES.map(s => (
              <div key={s.key} className="h-48 w-60 shrink-0 skeleton rounded-lg" />
            ))
          : STAGES.map(stage => (
              <KanbanColumn
                key={stage.key}
                stage={stage}
                leads={leads.filter(l => (l.stage ?? '').toLowerCase() === stage.key)}
                onDrop={handleDrop}
              />
            ))}
      </div>
    </div>
  )
}
