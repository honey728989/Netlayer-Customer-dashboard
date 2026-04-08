import { useState } from 'react'
import { CheckCircle2, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@netlayer/auth'
import { useQuery } from '@tanstack/react-query'
import { partnersApi } from '@netlayer/api'
import type { Lead } from '@netlayer/api'

const STEPS = [
  { id: 'survey',       label: 'Site Survey',        description: 'Physical site inspection and feasibility check' },
  { id: 'docs',         label: 'Documentation',      description: 'KYC, agreement signing, and GSTIN verification' },
  { id: 'provisioning', label: 'Provisioning',        description: 'Port allocation, IP assignment, CPE configuration' },
  { id: 'installation', label: 'Installation',        description: 'On-site equipment installation and cabling' },
  { id: 'testing',      label: 'Testing & Handover',  description: 'Link testing, SLA briefing, and customer acceptance' },
  { id: 'live',         label: 'Live',                description: 'Service active and billing started' },
]

function leadCompany(l: Lead) { return l.company_name ?? l.companyName ?? '—' }
function leadContact(l: Lead) { return l.contact_name ?? l.contactName ?? '' }
function leadService(l: Lead) { return l.service_type ?? l.serviceType ?? '' }
function leadBw(l: Lead)      { return l.bandwidth_required_mbps ?? l.bandwidthRequiredMbps ?? l.bandwidth_mbps ?? 0 }

function getStepIndex(lead: Lead): number {
  const stage = (lead.stage ?? '').toLowerCase()
  const map: Record<string, number> = { new: 0, qualified: 0, proposal: 1, negotiation: 2, won: 3, lost: -1 }
  return map[stage] ?? 0
}

function StepIndicator({ step, index, currentIndex }: { step: typeof STEPS[0]; index: number; currentIndex: number }) {
  const done   = index < currentIndex
  const active = index === currentIndex

  const dotBg    = done ? 'color-mix(in srgb, var(--status-online) 10%, transparent)' : active ? 'color-mix(in srgb, var(--brand) 10%, transparent)' : 'var(--bg-surface-2)'
  const dotBorder = done ? 'var(--status-online)' : active ? 'var(--brand)' : 'var(--border)'
  const labelColor = active ? 'var(--text-primary)' : done ? 'var(--text-muted)' : 'var(--text-dim)'

  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className="flex h-7 w-7 items-center justify-center rounded-full transition-colors"
             style={{ backgroundColor: dotBg, border: `1px solid ${dotBorder}` }}>
          {done
            ? <CheckCircle2 size={14} style={{ color: 'var(--status-online)' }} />
            : <span className="font-mono text-[10px] font-semibold" style={{ color: active ? 'var(--brand)' : 'var(--text-dim)' }}>{index + 1}</span>
          }
        </div>
        {index < STEPS.length - 1 && (
          <div className="mt-1 w-px flex-1 min-h-[28px]"
               style={{ backgroundColor: done ? 'color-mix(in srgb, var(--status-online) 30%, transparent)' : 'var(--border)' }} />
        )}
      </div>
      <div className="pb-6 pt-0.5">
        <p className="text-xs font-semibold" style={{ color: labelColor }}>{step.label}</p>
        <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>{step.description}</p>
      </div>
    </div>
  )
}

function OnboardingCard({ lead }: { lead: Lead }) {
  const currentStep = getStepIndex(lead)
  const [expanded, setExpanded] = useState(false)
  const progressPct = currentStep > 0 ? Math.round((currentStep / (STEPS.length - 1)) * 100) : 0

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors"
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-2)')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{leadCompany(lead)}</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {leadContact(lead)} · {leadService(lead)}{leadBw(lead) ? ` · ${leadBw(lead)}M` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>
              {STEPS[currentStep]?.label ?? 'Live'}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Step {currentStep + 1} of {STEPS.length}
            </p>
          </div>
          {/* Mini progress bar */}
          <div className="h-1.5 w-24 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-surface-3)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, backgroundColor: 'var(--brand)' }} />
          </div>
          <ChevronRight size={14} style={{ color: 'var(--text-muted)' }}
            className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
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
  const partnerId = user?.partnerId ?? user?.organizationId ?? ''

  const { data: leadsRaw, isLoading } = useQuery({
    queryKey: ['partners', partnerId, 'leads', 'won'],
    queryFn: () => partnersApi.getLeads(partnerId, { status: 'won', pageSize: 50 }),
    enabled: Boolean(partnerId),
    staleTime: 60_000,
  })

  const leads = (Array.isArray(leadsRaw) ? leadsRaw : (leadsRaw as any)?.data ?? []) as Lead[]
  const wonLeads = leads.filter(l => (l.stage ?? '').toLowerCase() === 'won')

  return (
    <div className="space-y-5 p-5 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Customer Onboarding</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Track installation progress for each new client</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active Onboardings',         value: wonLeads.length,                              accent: 'var(--brand)' },
          { label: 'Installations This Week',     value: wonLeads.filter(l => getStepIndex(l) === 3).length, accent: 'var(--status-degraded)' },
          { label: 'Ready to Go Live',            value: wonLeads.filter(l => getStepIndex(l) === 4).length, accent: 'var(--status-online)' },
        ].map(({ label, value, accent }) => (
          <div key={label} className="metric-card" style={{ borderTop: `2px solid ${accent}` }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p className="font-mono text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 skeleton rounded-lg" />
        ))}
        {!isLoading && wonLeads.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <CheckCircle2 size={32} style={{ color: 'var(--text-dim)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No active onboardings</p>
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Win a lead in the pipeline to start onboarding.</p>
          </div>
        )}
        {wonLeads.map(lead => <OnboardingCard key={lead.id} lead={lead} />)}
      </div>
    </div>
  )
}
