import { useState } from 'react'
import { CheckCircle2, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@netlayer/auth'
import { usePartnerLeads } from '@/hooks/useQueries'
import type { Lead } from '@netlayer/api'

interface OnboardingStep {
  id: string
  label: string
  description: string
}

const STEPS: OnboardingStep[] = [
  { id: 'survey',       label: 'Site Survey',        description: 'Physical site inspection and feasibility check' },
  { id: 'docs',         label: 'Documentation',      description: 'KYC, agreement signing, and GSTIN verification' },
  { id: 'provisioning', label: 'Provisioning',        description: 'Port allocation, IP assignment, CPE configuration' },
  { id: 'installation', label: 'Installation',        description: 'On-site equipment installation and cabling' },
  { id: 'testing',      label: 'Testing & Handover',  description: 'Link testing, SLA briefing, and customer acceptance' },
  { id: 'live',         label: 'Live',                description: 'Service active and billing started' },
]

// Simulated step index from lead metadata
function getStepIndex(lead: Lead): number {
  const stageMap: Record<Lead['stage'], number> = {
    new: 0, qualified: 0, proposal: 1, negotiation: 2, won: 3, lost: -1,
  }
  return stageMap[lead.stage] ?? 0
}

function StepIndicator({ step, index, currentIndex }: { step: OnboardingStep; index: number; currentIndex: number }) {
  const done = index < currentIndex
  const active = index === currentIndex

  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
          done ? 'border-status-online bg-status-online/10' :
          active ? 'border-brand bg-brand/10' :
          'border-border bg-surface-2'
        }`}>
          {done
            ? <CheckCircle2 size={14} className="text-status-online" />
            : <span className={`font-mono text-[10px] font-semibold ${active ? 'text-brand' : 'text-dim'}`}>{index + 1}</span>
          }
        </div>
        {index < STEPS.length - 1 && (
          <div className={`mt-1 w-px flex-1 min-h-[28px] ${done ? 'bg-status-online/30' : 'bg-border'}`} />
        )}
      </div>
      <div className="pb-6 pt-0.5">
        <p className={`text-xs font-semibold ${active ? 'text-white' : done ? 'text-muted' : 'text-dim'}`}>
          {step.label}
        </p>
        <p className="text-[11px] text-dim">{step.description}</p>
      </div>
    </div>
  )
}

function OnboardingCard({ lead }: { lead: Lead }) {
  const currentStep = getStepIndex(lead)
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-surface-2 transition-colors"
      >
        <div>
          <p className="text-sm font-semibold text-white">{lead.companyName}</p>
          <p className="text-[11px] text-muted">
            {lead.contactName} · {lead.serviceType} · {lead.bandwidthRequiredMbps}M
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-semibold text-brand">{STEPS[currentStep]?.label ?? 'Live'}</p>
            <p className="text-[10px] text-muted">Step {currentStep + 1} of {STEPS.length}</p>
          </div>
          {/* Mini progress bar */}
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${((currentStep) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
          <ChevronRight size={14} className={`text-muted transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-6 py-4">
          {STEPS.map((step, i) => (
            <StepIndicator key={step.id} step={step} index={i} currentIndex={currentStep} />
          ))}
        </div>
      )}
    </div>
  )
}

export function OnboardingPage() {
  const { user } = useAuthStore()
  const partnerId = user?.organizationId ?? ''

  const { data: leadsData, isLoading } = usePartnerLeads(partnerId, {
    stage: 'won',
    pageSize: 50,
  })

  const leads = leadsData?.data ?? []

  return (
    <div className="space-y-5 p-5">
      <div>
        <h1 className="font-display text-lg font-semibold text-white">Customer Onboarding</h1>
        <p className="text-xs text-muted">
          Track installation progress for each new client
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active Onboardings', value: leads.length, color: '#00d4ff' },
          { label: 'Installations Due This Week', value: leads.filter(l => getStepIndex(l) === 3).length, color: '#ffb300' },
          { label: 'Ready to Go Live', value: leads.filter(l => getStepIndex(l) === 4).length, color: '#00e676' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted">{label}</p>
            <p className="mt-1 font-mono text-2xl font-medium" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Onboarding cards */}
      <div className="space-y-3">
        {isLoading && (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-surface" />
          ))
        )}
        {!isLoading && leads.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <CheckCircle2 size={32} className="text-dim" />
            <p className="text-sm text-muted">No active onboardings</p>
            <p className="text-xs text-dim">Win a lead in the pipeline to start onboarding.</p>
          </div>
        )}
        {leads.map(lead => (
          <OnboardingCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  )
}
