/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean
  readonly VITE_API_URL?: string
  readonly VITE_WS_URL?: string
  readonly VITE_GRAFANA_URL?: string
  readonly VITE_ZABBIX_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
