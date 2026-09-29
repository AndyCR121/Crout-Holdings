import { ServiceTriggerConfig } from './i-service-trigger.interface';

/** 'url' = owner copies/distributes the link themselves; 'email' = the app sends it. */
export type CustomFormShareMethod = 'url' | 'email';

/** Owner-chosen validity cap — see design.md D9. No indefinite option. */
export const SHARE_LINK_MAX_VALIDITY_DAYS = 365;

/** Metadata-only view of a share link — never carries the URL/token (see design.md D1). */
export interface CustomFormShareLinkStatus {
  exists: boolean;
  isOwner: boolean;
  createdAtUtc?: string;
  expiresAtUtc?: string;
  revokedAtUtc?: string | null;
  lastUsedAtUtc?: string | null;
  submissionCount?: number;
  shareMethod?: CustomFormShareMethod | null;
  recipientEmails?: string[] | null;
}

/** Request body for generate/regenerate — the settings step's output. */
export interface GenerateCustomFormShareLinkRequest {
  shareMethod: CustomFormShareMethod;
  validityDays: number;
  recipientEmails?: string[];
}

/**
 * Returned only from generate/regenerate. For 'url', the one and only time the raw URL is
 * visible. For 'email', url is absent — the link was sent directly to recipientEmails instead.
 */
export interface CustomFormShareLinkGenerated {
  shareMethod: CustomFormShareMethod;
  url?: string | null;
  recipientEmails?: string[] | null;
  createdAtUtc: string;
  expiresAtUtc: string;
}

/**
 * Response from the public unauthenticated token-resolve endpoint. `config` is the exact
 * same ServiceTriggerConfigDto shape the authenticated in-portal renderer consumes (built by
 * the same BuildCustomFormTriggerConfig on the backend) — pass it straight to
 * ServiceTriggerRendererComponent rather than reconstructing a partial config from just the
 * schema, so field types/validation/responseMode can never drift from the authenticated path.
 */
export interface PublicCustomFormResolved {
  companyName: string;
  serviceName: string;
  config: ServiceTriggerConfig;
}
