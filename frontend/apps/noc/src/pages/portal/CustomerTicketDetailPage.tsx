import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ticketsApi, type TicketComment } from '@netlayer/api'
import { Card, PageHeader } from '@netlayer/ui'

function formatDate(value?: string) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-IN')
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

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <PageHeader
        title={ticket?.title ?? ticket?.subject ?? 'Ticket Detail'}
        subtitle={ticket ? `Ticket #${ticket.id.slice(-5)} • ${ticket.status}` : 'Track progress, SLA, and support updates'}
      />

      <div className="flex flex-wrap gap-2">
        <Link to="/portal/tickets" className="btn-ghost">Back to Tickets</Link>
        <Link to="/portal/tickets/new" className="btn-primary">Raise Another Ticket</Link>
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
    </div>
  )
}
