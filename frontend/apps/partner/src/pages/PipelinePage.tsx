import { useState } from 'react'
import { Plus, IndianRupee } from 'lucide-react'
import { useAuthStore } from '@netlayer/auth'
import { usePartnerLeads } from '@/hooks/useQueries'
import { partnersApi } from '@netlayer/api'
import { useMutation } from '@tanstack/react-query'
import { queryClient, queryKeys } from '@/services/queryClient'
import type { Lead } from '@netlayer/api'

const STAGES: Array<{ key: Lead['stage']; label: string; color: string }> = [
  { key: 'new', label: 'New', color: '#00d4ff' },
  { key: 'qualified', label: 'Qualified', color: '#9c7bff' },
  { key: 'proposal', label: 'Proposal', color: '#ffb300' },
  { key: 'negotiation', label: 'Negotiation', color: '#ff9900' },
  { key: 'won', label: 'Won', color: '#00e676' },
  { key: 'lost', label: 'Lost', color: '#ff4d4d' },
]

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('leadId', lead.id)}
      className="cursor-grab rounded-md border border-border bg-surface p-3 hover:border-border-2 active:cursor-grabbing transition-colors"
    >
      <p className="text-xs font-medium text-white">{lead.companyName}</p>
      <p className="mt-0.5 text-[10px] text-muted">{lead.contactName}</p>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted font-mono">
        <IndianRupee size={9} />
        {(lead.estimatedValue / 100).toLocaleString('en-IN')}
        <span className="ml-auto">{lead.serviceType}</span>
      </div>
    </div>
  )
}

function KanbanColumn({
  stage,
  leads,
  onDrop,
}: {
  stage: (typeof STAGES)[number]
  leads: Lead[]
  onDrop: (leadId: string, stage: Lead['stage']) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const totalValue = leads.reduce((sum, l) => sum + l.estimatedValue, 0)

  return (
    <div
      className={`flex w-64 shrink-0 flex-col rounded-lg border transition-colors ${
        isDragOver ? 'border-brand/40 bg-brand/5' : 'border-border bg-surface'
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        const id = e.dataTransfer.getData('leadId')
        if (id) onDrop(id, stage.key)
      }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: stage.color }} />
          <span className="text-xs font-semibold text-white">{stage.label}</span>
          <span className="font-mono text-[10px] text-muted">{leads.length}</span>
        </div>
        <span className="font-mono text-[9px] text-muted">
          ₹{(totalValue / 100).toLocaleString('en-IN')}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
        {leads.length === 0 && (
          <p className="py-8 text-center text-[10px] text-dim">Drop leads here</p>
        )}
      </div>
    </div>
  )
}

export function PipelinePage() {
  const { user } = useAuthStore()
  const partnerId = user?.organizationId ?? ''
  const { data: leadsData, isLoading } = usePartnerLeads(partnerId, { pageSize: 100 })

  const { mutate: updateLead } = useMutation({
    mutationFn: ({ leadId, stage }: { leadId: string; stage: Lead['stage'] }) =>
      partnersApi.updateLead(partnerId, leadId, { stage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.leads(partnerId) })
    },
  })

  const leads = leadsData?.data ?? []

  const handleDrop = (leadId: string, stage: Lead['stage']) => {
    const lead = leads.find((l) => l.id === leadId)
    if (lead && lead.stage !== stage) {
      updateLead({ leadId, stage })
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-5">
        <div>
          <h1 className="font-display text-lg font-semibold text-white">Sales Pipeline</h1>
          <p className="text-xs text-muted">Drag cards to update deal stage</p>
        </div>
        <button className="btn-primary">
          <Plus size={13} />
          Add Lead
        </button>
      </div>

      {/* Kanban board */}
      <div className="flex flex-1 gap-3 overflow-x-auto p-5">
        {isLoading
          ? STAGES.map((s) => (
              <div key={s.key} className="h-48 w-64 shrink-0 animate-pulse rounded-lg bg-surface" />
            ))
          : STAGES.map((stage) => (
              <KanbanColumn
                key={stage.key}
                stage={stage}
                leads={leads.filter((l) => l.stage === stage.key)}
                onDrop={handleDrop}
              />
            ))}
      </div>
    </div>
  )
}
