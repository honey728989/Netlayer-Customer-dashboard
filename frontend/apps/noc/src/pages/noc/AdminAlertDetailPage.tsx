import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Ticket } from 'lucide-react'
import { alertsApi } from '@netlayer/api'

export function AdminAlertDetailPage() {
  const { alertId = '' } = useParams()
  const queryClient = useQueryClient()

  const { data: alert } = useQuery({
    queryKey: ['admin', 'alert', alertId],
    queryFn: () => alertsApi.getById(alertId),
    enabled: Boolean(alertId),
  })

  const acknowledge = useMutation({
    mutationFn: () => alertsApi.acknowledge(alertId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'alert', alertId] })
      void queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })

  const resolve = useMutation({
    mutationFn: () => alertsApi.resolve(alertId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'alert', alertId] })
      void queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })

  return (
    <div className="space-y-5 p-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-dim">Alert Workspace</p>
          <h1 className="font-display text-2xl font-bold text-white">{alert?.message ?? 'Alert Detail'}</h1>
          <p className="mt-1 text-xs text-muted">
            {(alert?.source ?? 'Unknown source').toUpperCase()} · {(alert?.site_name ?? alert?.siteName ?? 'Unknown site')} · {(alert?.status ?? 'OPEN')}
          </p>
        </div>
        <Link to="/noc/alerts" className="btn-ghost">Back to Alerts</Link>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="card px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-muted">Priority</p>
          <p className="mt-2 font-mono text-xl font-bold text-white">{alert?.priority ?? 'P2'}</p>
        </div>
        <div className="card px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-muted">Status</p>
          <p className="mt-2 font-mono text-xl font-bold text-white">{alert?.status ?? 'OPEN'}</p>
        </div>
        <div className="card px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-muted">Triggered</p>
          <p className="mt-2 text-sm font-semibold text-white">{alert?.triggeredAt ?? alert?.created_at ?? 'Unknown'}</p>
        </div>
        <div className="card px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-muted">Linked Ticket</p>
          <p className="mt-2 text-sm font-semibold text-white">{alert?.ticket_id ?? alert?.ticketId ?? 'Not linked'}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-brand" />
            <h2 className="font-display text-sm font-semibold text-white">Alert Context</h2>
          </div>
          <div className="space-y-3 text-xs">
            <div className="rounded-lg border border-border bg-surface-2 p-3 text-muted">
              Device: {alert?.device_hostname ?? 'Unknown device'}
            </div>
            <div className="rounded-lg border border-border bg-surface-2 p-3 text-muted">
              External ID: {alert?.external_id ?? 'Not available'}
            </div>
            <div className="rounded-lg border border-border bg-surface-2 p-3 text-muted">
              Metadata: {alert?.metadata ? JSON.stringify(alert.metadata) : 'No metadata captured'}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-brand" />
              <h2 className="font-display text-sm font-semibold text-white">Alert Actions</h2>
            </div>
            <div className="space-y-2">
              <button onClick={() => acknowledge.mutate()} disabled={acknowledge.isPending} className="btn-primary w-full justify-center">
                Acknowledge
              </button>
              <button onClick={() => resolve.mutate()} disabled={resolve.isPending} className="btn-ghost w-full justify-center">
                Resolve
              </button>
              {alert?.ticket_id || alert?.ticketId ? (
                <Link to={`/noc/tickets/${alert.ticket_id ?? alert.ticketId}`} className="btn-ghost w-full justify-center">
                  <Ticket size={14} /> Open Linked Ticket
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
