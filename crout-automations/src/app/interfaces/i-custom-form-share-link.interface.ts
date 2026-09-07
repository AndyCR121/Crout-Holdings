import { ServiceTriggerConfig } from './i-service-trigger.interface';

/** Metadata-only view of a share link — never carries the URL/token (see design.md D1). */
export interface CustomFormShareLinkStatus {
  exists: boolean;
  isOwner: boolean;
  createdAtUtc?: string;
  expiresAtUtc?: string;
  revokedAtUtc?: string | null;
  lastUsedAtUtc?: string | null;
  submissionCount?: number;
}

/** Returned only from generate/regenerate — the one and only time the raw URL is visible. */
export interface CustomFormShareLinkGenerated {
  url: string;
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
