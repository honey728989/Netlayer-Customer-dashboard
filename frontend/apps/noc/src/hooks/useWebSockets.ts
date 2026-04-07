import { useEffect, useRef, useCallback } from 'react'
import type { WsEvent } from '@netlayer/api'
import { useAlertStore, useBandwidthStore, useSiteStatusStore } from '@/store'

type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

const WS_BASE = import.meta.env.VITE_WS_URL ?? `ws://${window.location.host}`
const RECONNECT_DELAY_MS = 3_000
const MAX_RECONNECT_ATTEMPTS = 10

function buildWsUrl(path: string): string {
  const token = localStorage.getItem('nl_access_token')
  return `${WS_BASE}${path}?token=${token ?? ''}`
}

function useWebSocket(path: string, onMessage: (event: WsEvent) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const attemptsRef = useRef(0)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    wsRef.current = new WebSocket(buildWsUrl(path))

    wsRef.current.onopen = () => {
      attemptsRef.current = 0
    }

    wsRef.current.onmessage = (ev: MessageEvent) => {
      try {
        const data: WsEvent = JSON.parse(ev.data as string)
        onMessage(data)
      } catch {
        /* ignore malformed frames */
      }
    }

    wsRef.current.onclose = () => {
      if (!mountedRef.current) return
      if (attemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        attemptsRef.current += 1
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }

    wsRef.current.onerror = () => {
      wsRef.current?.close()
    }
  }, [path, onMessage])

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])
}

export function useNocWebSockets() {
  const { pushAlert, updateAlert, removeAlert } = useAlertStore()
  const { pushPoint } = useBandwidthStore()
  const { applyStatusChange } = useSiteStatusStore()

  const handleAlerts = useCallback(
    (event: WsEvent) => {
      if (event.type === 'alert:new') pushAlert(event.payload)
      else if (event.type === 'alert:updated') updateAlert(event.payload.id, event.payload)
      else if (event.type === 'alert:resolved') removeAlert(event.payload.id)
    },
    [pushAlert, updateAlert, removeAlert],
  )

  const handleBandwidth = useCallback(
    (event: WsEvent) => {
      if (event.type === 'bandwidth:update') {
        pushPoint({
          timestamp: event.payload.timestamp,
          inboundGbps: event.payload.totalInboundGbps,
          outboundGbps: event.payload.totalOutboundGbps,
        })
      }
    },
    [pushPoint],
  )

  const handleSiteStatus = useCallback(
    (event: WsEvent) => {
      if (event.type === 'site:status_changed') {
        applyStatusChange(event.payload.siteId, event.payload.currentStatus)
      }
    },
    [applyStatusChange],
  )

  useWebSocket('/ws/alerts', handleAlerts)
  useWebSocket('/ws/bandwidth', handleBandwidth)
  useWebSocket('/ws/sites/status', handleSiteStatus)
}
