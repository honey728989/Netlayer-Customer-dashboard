import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { feasibilityApi, type FeasibilityRequest } from '@netlayer/api'

const STATUS_OPTIONS = ['requested', 'under_review', 'survey_scheduled', 'feasible', 'partially_feasible', 'quotation_shared', 'converted', 'closed']

export function AdminFeasibilityPage() {
  const [selectedId, setSelectedId] = useState<string>('')
  const queryClient = useQueryClient()

  const { data: requests = [] } = useQuery({
    queryKey: ['admin', 'feasibility'],
    queryFn: () => feasibilityApi.list(),
  })

  const selected = useMemo(
    () => requests.find((request: FeasibilityRequest) => request.id === selectedId) ?? requests[0],
    [requests, selectedId],
  )

  const { data: comments = [] } = useQuery({
    queryKey: ['admin', 'feasibility', selected?.id, 'comments'],
    queryFn: () => feasibilityApi.getComments(selected!.id),
    enabled: Boolean(selected?.id),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => feasibilityApi.updateStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'feasibility'] })
    },
  })

  return (
    <div className="grid h-full gap-4 p-5 xl:grid-cols-[320px_1fr]">
      <div className="card overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h1 className="font-display text-lg font-semibold text-white">Feasibility Queue</h1>
          <p className="mt-1 text-xs text-muted">{requests.length} active requests across sales, customer, and partner channels</p>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-3">
          <div className="space-y-2">
            {requests.map((request: FeasibilityRequest) => (
              <button
                key={request.id}
                onClick={() => setSelectedId(request.id)}
                className={selected?.id === request.id ? 'w-full rounded-lg border border-brand bg-brand/10 p-3 text-left' : 'w-full rounded-lg border border-border bg-surface-2 p-3 text-left'}
              >
                <p className="text-xs font-medium text-white">{request.company_name ?? request.customer_name ?? request.site_name ?? 'Feasibility Request'}</p>
                <p className="mt-1 font-mono text-[10px] text-dim">
                  {(request.city ?? 'NA')} · {(request.service_type ?? 'ILL')} · {request.bandwidth_mbps ?? 0} Mbps
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-widest text-muted">{request.status}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">{selected?.company_name ?? selected?.customer_name ?? 'Request Detail'}</h2>
              <p className="mt-1 text-xs text-muted">
                {(selected?.address ?? 'No address')} · {(selected?.city ?? 'NA')} · {(selected?.state ?? 'NA')}
              </p>
            </div>
            {selected ? (
              <select
                value={selected.status}
                onChange={(event) => updateStatus.mutate({ id: selected.id, status: event.target.value })}
                className="input-field h-9 min-w-[14rem] py-0 text-xs"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs">
              <p className="text-[10px] uppercase tracking-widest text-dim">Requested By</p>
              <p className="mt-1 text-white">{selected?.requested_by_name ?? selected?.contact_name ?? 'Unknown'}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs">
              <p className="text-[10px] uppercase tracking-widest text-dim">Assigned Engineer</p>
              <p className="mt-1 text-white">{selected?.assigned_engineer_name ?? 'Unassigned'}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs">
              <p className="text-[10px] uppercase tracking-widest text-dim">Commercial Estimate</p>
              <p className="mt-1 text-white">₹{Number(selected?.estimated_mrc ?? 0).toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="font-display text-sm font-semibold text-white">Timeline & Notes</h2>
          <div className="mt-3 space-y-2 text-xs">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-lg border border-border bg-surface-2 px-3 py-2">
                <p className="font-medium text-white">{comment.author_name ?? 'System'}</p>
                <p className="mt-1 text-muted">{comment.body}</p>
                <p className="mt-1 font-mono text-[10px] text-dim">{comment.created_at ? new Date(comment.created_at).toLocaleString('en-IN') : ''}</p>
              </div>
            ))}
            {comments.length === 0 ? <p className="text-dim">No comments yet</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
