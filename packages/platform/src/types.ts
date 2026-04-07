export type RoleName =
  | "SUPER_ADMIN"
  | "NOC_ENGINEER"
  | "ENTERPRISE_ADMIN"
  | "ENTERPRISE_USER"
  | "PARTNER_ADMIN"
  | "PARTNER_USER";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  roles: RoleName[];
  customerId?: string;
  partnerId?: string;
}

export interface JwtPayload extends AuthenticatedUser {
  type: "access" | "refresh";
}

export interface ServiceEnv {
  nodeEnv: string;
  logLevel: string;
  serviceName: string;
  port: number;
  postgresUrl: string;
  redisUrl: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtIssuer: string;
  jwtAudience: string;
  rateLimitMax: number;
  rateLimitWindow: string;
  internalServiceToken: string;
  queueAttempts: number;
  queueBackoffMs: number;
  queueDedupTtlSeconds: number;
  externalApiTimeoutMs: number;
  circuitBreakerFailures: number;
  circuitBreakerResetMs: number;
}

export interface AlertRecord {
  id: string;
  externalId?: string;
  siteId: string;
  deviceId?: string;
  severity: "P1" | "P2" | "P3" | "P4";
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  source: "ZABBIX" | "MANUAL";
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}
