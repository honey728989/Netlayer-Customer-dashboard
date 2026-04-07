// ─── Core Domain Types ────────────────────────────────────────────────────────

export type SiteStatus = 'online' | 'offline' | 'degraded' | 'maintenance'
export type SiteType = 'ILL' | 'Business Broadband'
export type AlertPriority = 'P1' | 'P2' | 'P3' | 'P4'
export type AlertStatus = 'active' | 'acknowledged' | 'resolved'
export type TicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed'
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low'
export type UserRole = 'admin' | 'customer' | 'partner'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl?: string
  organizationId: string
  organizationName: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

// ─── Sites ────────────────────────────────────────────────────────────────────

export interface Site {
  id: string
  name: string
  type: SiteType
  status: SiteStatus
  customerId: string
  customerName: string
  city: string
  state: string
  address: string
  bandwidthMbps: number
  bandwidthUsedPercent: number
  latencyMs: number
  packetLossPercent: number
  uplinkIp: string
  deviceCount: number
  lastSeenAt: string
  contractExpiry: string
  slaPercent: number
}

export interface SiteTraffic {
  timestamp: string
  inboundMbps: number
  outboundMbps: number
}

export interface SiteDevice {
  id: string
  name: string
  type: 'router' | 'switch' | 'firewall' | 'cpe'
  status: 'up' | 'down' | 'rebooting'
  ip: string
  model: string
  uptime: string
}

export interface SiteEvent {
  id: string
  timestamp: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  source: string
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export interface Alert {
  id: string
  siteId: string
  siteName: string
  priority: AlertPriority
  status: AlertStatus
  type: string
  message: string
  source: 'zabbix' | 'internal' | 'manual'
  triggeredAt: string
  acknowledgedAt?: string
  acknowledgedBy?: string
  resolvedAt?: string
  ticketId?: string
  metadata?: Record<string, string>
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export interface Ticket {
  id: string
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  customerId: string
  customerName: string
  siteId?: string
  siteName?: string
  assigneeId?: string
  assigneeName?: string
  slaDeadline: string
  slaBreached: boolean
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  alertId?: string
  comments: TicketComment[]
}

export interface TicketComment {
  id: string
  authorId: string
  authorName: string
  authorRole: string
  body: string
  createdAt: string
  isInternal: boolean
}

// ─── Customers ────────────────────────────────────────────────────────────────

export interface Customer {
  id: string
  name: string
  gstin: string
  email: string
  phone: string
  accountManagerId: string
  accountManagerName: string
  partnerId?: string
  partnerName?: string
  siteCount: number
  activeTickets: number
  monthlyArv: number
  contractValue: number
  status: 'active' | 'suspended' | 'churned'
  createdAt: string
}

// ─── Partners ─────────────────────────────────────────────────────────────────

export interface Partner {
  id: string
  name: string
  email: string
  phone: string
  city: string
  tier: 'silver' | 'gold' | 'platinum'
  clientCount: number
  monthlyRevenue: number
  pendingCommission: number
  paidCommission: number
  activeLeads: number
  createdAt: string
}

export interface Lead {
  id: string
  companyName: string
  contactName: string
  contactEmail: string
  contactPhone: string
  serviceType: SiteType
  bandwidthRequiredMbps: number
  stage: 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
  estimatedValue: number
  partnerId: string
  createdAt: string
  updatedAt: string
}

export interface Commission {
  id: string
  partnerId: string
  month: string
  totalRevenue: number
  commissionRate: number
  commissionAmount: number
  status: 'pending' | 'approved' | 'paid'
  paidAt?: string
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface QueryParams {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  [key: string]: string | number | boolean | undefined
}

// ─── WebSocket Events ─────────────────────────────────────────────────────────

export interface WsAlertEvent {
  type: 'alert:new' | 'alert:updated' | 'alert:resolved'
  payload: Alert
}

export interface WsBandwidthEvent {
  type: 'bandwidth:update'
  payload: {
    totalInboundGbps: number
    totalOutboundGbps: number
    timestamp: string
    perSite?: Record<string, { inbound: number; outbound: number }>
  }
}

export interface WsSiteStatusEvent {
  type: 'site:status_changed'
  payload: {
    siteId: string
    siteName: string
    previousStatus: SiteStatus
    currentStatus: SiteStatus
    timestamp: string
  }
}

export type WsEvent = WsAlertEvent | WsBandwidthEvent | WsSiteStatusEvent

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiError {
  code: string
  message: string
  details?: Record<string, string>
}
