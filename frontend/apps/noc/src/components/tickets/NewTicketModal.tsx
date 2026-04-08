import { useState } from 'react'
import { X } from 'lucide-react'
import { useCreateTicket } from '@/hooks/useQueries'
import type { TicketPriority } from '@netlayer/api'

interface NewTicketModalProps {
  onClose: () => void
  defaultCustomerId?: string
  defaultSiteId?: string
}

export function NewTicketModal({ onClose, defaultCustomerId, defaultSiteId }: NewTicketModalProps) {
  const { mutate: createTicket, isPending } = useCreateTicket()
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'P3' as TicketPriority,
    customerId: defaultCustomerId ?? '',
    siteId: defaultSiteId ?? '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createTicket(
      { title: form.title, description: form.description, priority: form.priority, customerId: form.customerId, siteId: form.siteId || undefined, source: 'PORTAL' },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-sm font-semibold text-white">New Ticket</h2>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted">
              Subject *
            </label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="input-field"
              placeholder="Brief description of the issue"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted">
                Priority *
              </label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TicketPriority }))}
                className="input-field"
              >
                <option value="P1">P1 - Critical</option>
                <option value="P2">P2 - High</option>
                <option value="P3">P3 - Medium</option>
                <option value="P4">P4 - Low</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted">
                Customer ID *
              </label>
              <input
                required
                value={form.customerId}
                onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
                className="input-field"
                placeholder="cust_…"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted">
              Site ID (optional)
            </label>
            <input
              value={form.siteId}
              onChange={(e) => setForm((f) => ({ ...f, siteId: e.target.value }))}
              className="input-field"
              placeholder="site_…"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted">
              Description *
            </label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="input-field resize-none"
              placeholder="Detailed description, steps to reproduce, impact…"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60">
              {isPending ? 'Creating…' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
