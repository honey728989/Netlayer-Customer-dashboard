type ViteEnvLike = {
  DEV?: boolean
  VITE_WS_URL?: string
  VITE_GRAFANA_URL?: string
  VITE_ZABBIX_URL?: string
}

const viteEnv = (import.meta as { env?: ViteEnvLike }).env ?? {}

export const appEnv = {
  isDev: Boolean(viteEnv.DEV),
  wsUrl: viteEnv.VITE_WS_URL,
  grafanaUrl: viteEnv.VITE_GRAFANA_URL,
  zabbixUrl: viteEnv.VITE_ZABBIX_URL,
}
