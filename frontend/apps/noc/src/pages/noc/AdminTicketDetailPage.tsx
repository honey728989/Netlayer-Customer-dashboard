import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, ShieldAlert, UserCheck } from 'lucide-react'
import { ticketsApi, type TicketComment } from '@netlayer/api'

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED']

export function AdminTicketDetailPage() {
  const { ticketId = '' } = useParams()
  const [comment, setComment] = useState('')
  const queryClient = useQueryClient()

  const { data: ticket } = useQuery({
    queryKey: ['admin', 'ticket', ticketId],
    queryFn: () => ticketsApi.getById(ticketId),
    enabled: Boolean(ticketId),
  })

  const addComment = useMutation({
    mutationFn: () => ticketsApi.addComment(ticketId, comment, true),
    onSuccess: () => {
      setComment('')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'ticket', ticketId] })
    },
  })

  const updateStatus = useMutation({
    mutationFn: (status: string) => ticketsApi.update(ticketId, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'ticket', ticketId] })
    },
  })

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-dim">Ticket Workspace</p>
          <h1 className="font-display text-2xl font-bold text-white">{ticket?.title ?? ticket?.subject ?? 'Ticket Detail'}</h1>
          <p className="mt-1 text-xs text-muted">
            #{ticket?.id.slice(-6) ?? '------'} · {(ticket?.customer_name ?? ticket?.customerName ?? 'Unknown customer')} · {(ticket?.site_name ?? ticket?.siteName ?? 'No site')}
          </p>
        </div>
        <Link to="/noc/tickets" className="btn-ghost">Back to Tickets</Link>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="card px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-muted">Priority</p>
          <p className="mt-2 font-mono text-xl font-bold text-white">{ticket?.priority ?? 'P3'}</p>
        </div>
        <div className="card px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-muted">Status</p>
          <p className="mt-2 font-mono text-xl font-bold text-white">{ticket?.status ?? 'OPEN'}</p>
        </div>
        <div className="card px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-muted">Assignee</p>
          <p className="mt-2 text-sm font-semibold text-white">{ticket?.assignee_name ?? ticket?.assigneeName ?? 'Unassigned'}</p>
        </div>
        <div className="card px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-muted">SLA Deadline</p>
          <p className="mt-2 text-sm font-semibold text-white">{ticket?.resolution_due_at ?? ticket?.resolutionDueAt ?? 'Not set'}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <div className="card p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldAlert size={14} className="text-brand" />
              <h2 className="font-display text-sm font-semibold text-white">Issue Summary</h2>
            </div>
            <p className="text-sm text-muted">{ticket?.description}</p>
            {ticket?.resolution_summary ? (
              <div className="mt-4 rounded-lg border border-border bg-surface-2 p-3 text-xs">
                <p className="text-[10px] uppercase tracking-widest text-dim">Resolution Summary</p>
                <p className="mt-1 text-white">{ticket.resolution_summary}</p>
              </div>
            ) : null}
          </div>

          <div className="card p-4">
            <div className="mb-3 flex items-center gap-2">
              <MessageSquare size={14} className="text-brand" />
              <h2 className="font-display text-sm font-semibold text-white">Internal Timeline</h2>
            </div>
            <div className="space-y-2">
              {(ticket?.comments ?? []).map((entry: TicketComment) => (
                <div key={entry.id} className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs">
                  <p className="font-medium text-white">{entry.author_name ?? entry.authorName ?? 'System'}</p>
                  <p className="mt-1 text-muted">{entry.body}</p>
                </div>
              ))}
              {(!ticket?.comments || ticket.comments.length === 0) ? <p className="text-xs text-dim">No comments yet</p> : null}
            </div>
            <div className="mt-3 flex gap-2">
              <input value={comment} onChange={(event) => setComment(event.target.value)} className="input-field flex-1" placeholder="Add internal update" />
              <button onClick={() => addComment.mutate()} disabled={!comment.trim() || addComment.isPending} className="btn-primary">Add</button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="mb-3 flex items-center gap-2">
              <UserCheck size={14} className="text-brand" />
              <h2 className="font-display text-sm font-semibold text-white">Workflow Controls</h2>
            </div>
            <select
              value={ticket?.status ?? 'OPEN'}
              onChange={(event) => updateStatus.mutate(event.target.value)}
              className="input-field w-full"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <div className="mt-3 rounded-lg border border-border bg-surface-2 p-3 text-xs text-muted">
              Linked alert: {ticket?.alert_id ?? ticket?.alertId ?? 'None'}<br />
              Source: {ticket?.source ?? 'manual'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
