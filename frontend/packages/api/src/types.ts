// ─── Core Domain Types ────────────────────────────────────────────────────────

export type SiteStatus = 'online' | 'offline' | 'degraded' | 'maintenance' | 'UP' | 'DOWN' | 'DEGRADED' | 'MAINTENANCE'
export type SiteType = 'ILL' | 'Business Broadband' | 'BB' | 'MPLS' | 'SIP' | 'MANAGED'
export type AlertPriority = 'P1' | 'P2' | 'P3' | 'P4'
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'
export type TicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed' | 'OPEN' | 'IN_PROGRESS' | 'PENDING' | 'RESOLVED' | 'CLOSED'
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low' | 'P1' | 'P2' | 'P3' | 'P4'
export type UserRole = 'admin' | 'customer' | 'partner'
export type BackendRole =
  | 'SUPER_ADMIN'
  | 'NOC_ENGINEER'
  | 'ENTERPRISE_ADMIN'
  | 'ENTERPRISE_USER'
  | 'PARTNER_ADMIN'
  | 'PARTNER_USER'
  | 'SALES_EXECUTIVE'
  | 'FINANCE_USER'
  | 'FIELD_ENGINEER'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  userId?: string
  name: string
  fullName?: string
  email: string
  role: UserRole
  roles?: BackendRole[]
  avatarUrl?: string
  organizationId?: string
  organizationName?: string
  customerId?: string
  partnerId?: string
  accountScope?: 'platform' | 'customer' | 'partner' | 'internal'
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
  code?: string
  type?: SiteType
  status: string
  customer_id?: string
  customerId?: string
  customer_name?: string
  customerName?: string
  city?: string
  state?: string
  address?: string
  ip_block?: string
  pop?: string
  last_mile_provider?: string
  bandwidth_mbps?: number
  bandwidthMbps?: number
  total_bandwidth_mbps?: string
  bandwidthUsedPercent?: number
  latencyMs?: number
  packetLossPercent?: number
  device_count?: string | number
  deviceCount?: number
  service_count?: string | number
  go_live_date?: string
  contract_end_date?: string
  contractExpiry?: string
  slaPercent?: number
  created_at?: string
  dashboard_uid?: string
}

export interface SiteTraffic {
  timestamp?: string
  metric_time?: string
  inboundMbps?: number
  outboundMbps?: number
  inbound_bps?: number
  outbound_bps?: number
  latency_ms?: number
  packet_loss_pct?: number
}

export interface SiteDevice {
  id: string
  hostname?: string
  name?: string
  type?: 'router' | 'switch' | 'firewall' | 'cpe'
  status: string
  ip_address?: string
  ip?: string
  vendor?: string
  model?: string
  uptime?: string
  last_seen_at?: string
  created_at?: string
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
  site_id?: string
  siteId?: string
  site_name?: string
  siteName?: string
  device_hostname?: string
  severity?: string
  priority: AlertPriority
  status: string
  type?: string
  message: string
  source: string
  created_at?: string
  triggeredAt?: string
  acknowledged_at?: string
  acknowledgedAt?: string
  acknowledged_by?: string
  acknowledgedBy?: string
  resolved_at?: string
  resolvedAt?: string
  ticket_id?: string
  ticketId?: string
  external_id?: string
  metadata?: Record<string, unknown>
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export interface Ticket {
  id: string
  title?: string
  subject?: string
  description: string
  status: string
  priority: string
  customer_id?: string
  customerId?: string
  customer_name?: string
  customerName?: string
  site_id?: string
  siteId?: string
  site_name?: string
  siteName?: string
  assignee_id?: string
  assigneeId?: string
  assignee_name?: string
  assigneeName?: string
  response_due_at?: string
  responseDueAt?: string
  resolution_due_at?: string
  resolutionDueAt?: string
  slaDeadline?: string
  slaBreached?: boolean
  created_at?: string
  createdAt?: string
  updated_at?: string
  updatedAt?: string
  resolved_at?: string
  resolvedAt?: string
  alert_id?: string
  alertId?: string
  source?: string
  resolution_summary?: string
  comments?: TicketComment[]
}

export interface TicketComment {
  id: string
  author_id?: string
  authorId?: string
  author_name?: string
  authorName?: string
  authorRole?: string
  body: string
  created_at?: string
  createdAt?: string
  is_internal?: boolean
  isInternal?: boolean
}

// ─── Customers ────────────────────────────────────────────────────────────────

export interface Customer {
  id: string
  name: string
  code?: string
  gstin?: string
  email?: string
  phone?: string
  tier?: string
  industry?: string
  status: string
  account_manager?: string
  accountManagerId?: string
  accountManagerName?: string
  partner_id?: string
  partnerId?: string
  partner_name?: string
  partnerName?: string
  site_count?: string | number
  siteCount?: number
  activeTickets?: number
  monthly_recurring_revenue?: number | string
  monthlyArv?: number
  annual_contract_value?: number | string
  contractValue?: number
  sla_profile?: string
  contract_end_date?: string
  created_at?: string
  createdAt?: string
}

export interface CustomerContact {
  id: string
  name: string
  email?: string
  phone?: string
  role?: string
  designation?: string
  is_primary?: boolean
  isPrimary?: boolean
  contact_type?: string
  contactType?: string
}

export interface CustomerProfile {
  id: string
  name: string
  code?: string
  status: string
  tier?: string
  slaProfile?: string
  accountManager?: string
  industry?: string
  billingEmail?: string
  primaryContactName?: string
  primaryContactPhone?: string
  contractStartDate?: string | null
  contractEndDate?: string | null
  monthlyRecurringRevenue?: number
  annualContractValue?: number
}

export interface CustomerProfilePayload {
  name: string
  industry?: string
  billingEmail?: string
  primaryContactName?: string
  primaryContactPhone?: string
}

export interface CustomerContactPayload {
  id?: string
  name: string
  email?: string
  phone?: string
  role?: string
  designation?: string
  isPrimary?: boolean
  contactType?: string
}

// ─── Partners ─────────────────────────────────────────────────────────────────

export interface Partner {
  id: string
  name: string
  code?: string
  email?: string
  phone?: string
  region?: string
  city?: string
  tier?: string
  status?: string
  commission_plan?: string
  customer_count?: string | number
  clientCount?: number
  monthly_revenue?: number | string
  monthlyRevenue?: number
  pendingCommission?: number
  paidCommission?: number
  activeLeads?: number
  created_at?: string
  createdAt?: string
}

export interface Lead {
  id: string
  company_name?: string
  companyName?: string
  contact_name?: string
  contactName?: string
  contact_email?: string
  contactEmail?: string
  contact_phone?: string
  contactPhone?: string
  city?: string
  state?: string
  source?: string
  stage: string
  service_type?: string
  serviceType?: SiteType
  bandwidth_mbps?: number
  bandwidth_required_mbps?: number
  bandwidthRequiredMbps?: number
  expected_value?: number | string
  expected_mrc?: number | string
  estimatedValue?: number
  partner_id?: string
  partnerId?: string
  partner_name?: string
  assigned_to?: string
  owner_user_id?: string
  created_at?: string
  createdAt?: string
  updated_at?: string
  updatedAt?: string
  lost_reason?: string
  notes?: string
}

export interface Commission {
  id: string
  partner_id?: string
  partnerId?: string
  commission_period?: string
  month?: string
  gross_revenue?: number
  totalRevenue?: number
  commission_rate?: number
  commissionRate?: number
  commission_amount?: number
  commissionAmount?: number
  status: string
  paid_at?: string
  paidAt?: string
  created_at?: string
}

// ─── Services / Circuits ─────────────────────────────────────────────────────

export interface Service {
  id: string
  customer_id?: string
  site_id?: string
  service_id?: string
  circuit_id?: string
  service_type?: string
  bandwidth_mbps?: number
  pop?: string
  last_mile?: string
  ip_block?: string
  static_ip?: string
  status?: string
  activation_date?: string
  contract_end_date?: string
  contract_months?: number
  monthly_charge?: number
  notes?: string
  metadata?: Record<string, unknown>
  site_name?: string
  city?: string
  state?: string
}

// ─── Feasibility ─────────────────────────────────────────────────────────────

export interface FeasibilityRequest {
  id: string
  request_code?: string
  site_name?: string
  siteName?: string
  customer_id?: string
  customer_name?: string
  requested_by_name?: string
  assigned_engineer_name?: string
  source?: string
  company_name?: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  service_type?: string
  bandwidth_mbps?: number
  redundancy_required?: boolean
  status: string
  survey_date?: string
  survey_scheduled_for?: string
  expected_go_live_date?: string
  result_notes?: string
  feasibility_summary?: string
  estimated_capex?: number
  estimated_mrc?: number
  survey_notes?: string
  notes?: string
  created_at?: string
  comments?: FeasibilityComment[]
}

export interface FeasibilityComment {
  id: string
  body: string
  author_name?: string
  is_internal?: boolean
  created_at?: string
}

export interface CustomerHeatmapPoint {
  siteId: string
  siteName: string
  city?: string | null
  state?: string | null
  latitude?: number | null
  longitude?: number | null
  status: string
  serviceCount: number
  totalBandwidthMbps: number
  activeAlertCount: number
  latestLatencyMs?: number | null
  latestPacketLossPct?: number | null
}

export interface BillingLedgerSummary {
  invoicedAmount: number
  outstandingAmount: number
  overdueInvoices: number
  collectedAmount: number
  pendingPaymentLinks: number
}

export interface FinanceSummary {
  invoices: {
    totalOutstanding: number
    paidInvoices: number
    overdueInvoices: number
  }
  payments: {
    pending: number
    collectedAmount: number
  }
}

export interface BillingInvoice {
  id: string
  invoice_number?: string
  invoiceNumber?: string
  invoice_date?: string
  date?: string
  due_date?: string
  dueDate?: string
  total_amount?: number
  amount?: number
  balance?: number
  status: string
  payment_status?: string
  pdf_url?: string
  pdfUrl?: string
  line_items?: Array<{
    name?: string
    description?: string
    quantity?: number
    rate?: number
    item_total?: number
  }>
}

export interface BillingInvoiceDetail {
  invoice: BillingInvoice
  payments: PaymentRecord[]
  customer: {
    id: string
    name: string
    code?: string
    zohoCustomerId?: string | null
  }
}

export interface SiteBillingSummary {
  siteId: string
  siteName: string
  city?: string
  state?: string
  status: string
  serviceCount: number
  totalBandwidthMbps: number
  monthlyRecurringAmount: number
  contractEndDate?: string | null
  estimatedOutstandingAmount: number
  portfolioSharePct: number
}

export interface CustomerPortalUser {
  id: string
  email: string
  fullName: string
  isActive: boolean
  roles: BackendRole[]
  accessLevels: string[]
  scopeMode: 'ALL_SITES' | 'SELECTED_SITES'
  assignedSites: number
  siteNames: string[]
  accessProfile: string
  createdAt?: string
}

export interface CustomerPortalUserPayload {
  email: string
  fullName: string
  password?: string
  role: 'ENTERPRISE_ADMIN' | 'ENTERPRISE_USER'
  scopeMode: 'ALL_SITES' | 'SELECTED_SITES'
  accessLevels: string[]
  siteIds?: string[]
  isActive?: boolean
}

export interface CustomerSiteGroup {
  id: string
  name: string
  description?: string | null
  groupType: string
  memberCount: number
  siteNames: string[]
}

export interface CustomerSiteAccessRow {
  siteId: string
  siteName: string
  city?: string | null
  status: string
  assignments: Array<{
    userId: string
    fullName: string
    email: string
    accessLevel: string
  }>
}

export interface CustomerServiceRequest {
  id: string
  requestCode: string
  requestType: 'BANDWIDTH_UPGRADE' | 'RELOCATION' | 'STATIC_IP' | 'SERVICE_SHIFT' | 'CONTRACT_RENEWAL' | 'GENERAL'
  status: string
  priority: string
  title: string
  description: string
  serviceId?: string | null
  serviceName?: string | null
  siteId?: string | null
  siteName?: string | null
  requestedByName?: string | null
  createdAt?: string
  updatedAt?: string
  targetValue?: string | null
  metadata?: Record<string, unknown>
}

export interface CustomerServiceRequestPayload {
  requestType: CustomerServiceRequest['requestType']
  priority?: string
  title: string
  description: string
  serviceId?: string
  siteId?: string
  targetValue?: string
}

export interface CustomerAuditLog {
  id: number
  action: string
  entityType: string
  entityId: string
  createdAt?: string
  actorName?: string | null
  actorEmail?: string | null
  details?: Record<string, unknown>
}

export interface CustomerDocument {
  id: string
  title: string
  category: 'CONTRACT' | 'KYC' | 'BILLING' | 'IMPLEMENTATION' | 'REPORT' | 'COMPLIANCE' | 'OTHER'
  status: string
  fileUrl?: string | null
  notes?: string | null
  linkedSiteId?: string | null
  linkedSiteName?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CustomerDocumentPayload {
  title: string
  category: CustomerDocument['category']
  fileUrl?: string
  notes?: string
  linkedSiteId?: string
  status?: string
}

export interface PaymentRecord {
  id: string
  customer_id?: string
  customerId?: string
  invoice_id?: string
  invoiceId?: string
  amount: number | string
  status: string
  payment_method?: string
  paymentMethod?: string
  payment_link?: string
  paymentLink?: string
  paid_at?: string
  paidAt?: string
  payload?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page?: number
  pageSize?: number
  totalPages?: number
}

export interface QueryParams {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  status?: string
  priority?: string
  customerId?: string
  partnerId?: string
  [key: string]: string | number | boolean | undefined
}

// ─── WebSocket Events ─────────────────────────────────────────────────────────

export interface WsAlertEvent {
  type: 'alert:new' | 'alert:updated' | 'alert:resolved' | 'alert.new' | 'alert.acknowledged'
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

// ─── API Error ────────────────────────────────────────────────────────────────

export interface ApiError {
  code: string
  message: string
  details?: Record<string, string>
}
