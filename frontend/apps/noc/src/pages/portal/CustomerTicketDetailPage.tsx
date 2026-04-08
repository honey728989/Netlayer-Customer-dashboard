import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ticketsApi, type TicketComment } from '@netlayer/api'
import { Card, PageHeader } from '@netlayer/ui'

function formatDate(value?: string) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-IN')
}

function getSlaMeta(ticket: any) {
  const dueAt = ticket?.resolution_due_at ?? ticket?.resolutionDueAt
  if (!dueAt) {
    return { label: 'No SLA deadline', color: 'var(--text-dim)' }
  }

  const diff = new Date(dueAt).getTime() - Date.now()
  if (diff <= 0) {
    return { label: 'SLA breached', color: 'var(--status-offline)' }
  }
  if (diff <= 2 * 60 * 60 * 1000) {
    return { label: 'SLA at risk', color: 'var(--status-degraded)' }
  }

  return { label: 'SLA healthy', color: 'var(--status-online)' }
}

export function CustomerTicketDetailPage() {
  const { ticketId = '' } = useParams()
  const queryClient = useQueryClient()
  const [commentBody, setCommentBody] = useState('')

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => ticketsApi.getById(ticketId),
    enabled: Boolean(ticketId),
    staleTime: 15_000,
  })

  const commentMutation = useMutation({
    mutationFn: () => ticketsApi.addComment(ticketId, commentBody, false),
    onSuccess: async () => {
      setCommentBody('')
      await queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
      await queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })

  const handleCommentSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!commentBody.trim()) return
    commentMutation.mutate()
  }

  const comments = (ticket?.comments ?? []) as TicketComment[]
  const slaMeta = getSlaMeta(ticket)
  const timelineItems = [
    ticket?.created_at ?? ticket?.createdAt
      ? {
          label: 'Ticket opened',
          detail: 'Issue logged in customer portal',
          at: ticket.created_at ?? ticket.createdAt,
        }
      : null,
    ...comments.map((comment) => ({
      label: comment.author_name ?? comment.authorName ?? 'Support update',
      detail: comment.body,
      at: comment.created_at ?? comment.createdAt,
    })),
    ticket?.resolved_at ?? ticket?.resolvedAt
      ? {
          label: 'Ticket resolved',
          detail: ticket.resolution_summary ?? 'Resolution shared by support team',
          at: ticket.resolved_at ?? ticket.resolvedAt,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; detail: string; at?: string }>

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <PageHeader
        title={ticket?.title ?? ticket?.subject ?? 'Ticket Detail'}
        subtitle={ticket ? `Ticket #${ticket.id.slice(-5)} • ${ticket.status}` : 'Track progress, SLA, and support updates'}
      />

      <div className="flex flex-wrap gap-2">
        <Link to="/portal/tickets" className="btn-ghost">Back to Tickets</Link>
        <Link to={ticket?.site_id || ticket?.siteId ? `/portal/tickets/new?siteId=${ticket.site_id ?? ticket.siteId}` : '/portal/tickets/new'} className="btn-primary">
          Raise Another Ticket
        </Link>
      </div>

      <div
        className="rounded-xl border px-4 py-3"
        style={{
          borderColor: 'color-mix(in srgb, var(--border) 70%, transparent)',
          backgroundColor: `color-mix(in srgb, ${slaMeta.color} 10%, var(--bg-surface-2))`,
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>SLA Status</p>
            <p className="mt-1 font-mono text-sm font-semibold" style={{ color: slaMeta.color }}>{slaMeta.label}</p>
          </div>
          {(ticket?.site_name ?? ticket?.siteName) ? (
            <Link to={`/portal/sites/${ticket?.site_id ?? ticket?.siteId}`} className="text-[11px] hover:underline" style={{ color: 'var(--brand)' }}>
              View Site
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.9fr]">
        <Card title="Issue Summary">
          {isLoading ? (
            <div className="space-y-3">
              <div className="skeleton h-5 w-56 rounded" />
              <div className="skeleton h-24 w-full rounded" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {[
                  ['Priority', ticket?.priority ?? '—'],
                  ['Status', ticket?.status ?? '—'],
                  ['Site', ticket?.site_name ?? ticket?.siteName ?? 'General'],
                  ['Source', ticket?.source ?? 'Portal'],
                  ['Opened', formatDate(ticket?.created_at ?? ticket?.createdAt)],
                  ['Resolution Due', formatDate(ticket?.resolution_due_at ?? ticket?.resolutionDueAt)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
                    <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p>
                    <p className="mt-1 font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Description</p>
                <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-primary)' }}>{ticket?.description ?? '—'}</p>
              </div>
              {ticket?.resolution_summary ? (
                <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'color-mix(in srgb, var(--status-online) 6%, var(--bg-surface-2))' }}>
                  <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Resolution Summary</p>
                  <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-primary)' }}>{ticket.resolution_summary}</p>
                </div>
              ) : null}
            </div>
          )}
        </Card>

        <Card title="Conversation">
          <div className="space-y-3">
            {comments.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No updates yet. You can add a note for the support team below.</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{comment.author_name ?? comment.authorName ?? 'Support Team'}</p>
                    <span className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
                      {formatDate(comment.created_at ?? comment.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-primary)' }}>{comment.body}</p>
                </div>
              ))
            )}

            <form onSubmit={handleCommentSubmit} className="space-y-3 rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
              <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>
                Add Update
                <textarea
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  className="input-field mt-1 min-h-24"
                  placeholder="Share impact, updated observations, or confirm whether service is restored."
                />
              </label>
              <button type="submit" className="btn-primary" disabled={commentMutation.isPending || !commentBody.trim()}>
                {commentMutation.isPending ? 'Posting...' : 'Post Comment'}
              </button>
            </form>
          </div>
        </Card>
      </div>

      <Card title="Ticket Timeline">
        <div className="space-y-3">
          {timelineItems.map((item, index) => (
            <div key={`${item.label}-${index}`} className="flex gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
              <div className="mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--brand)' }} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                  <span className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>{formatDate(item.at)}</span>
                </div>
                <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-muted)' }}>{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
