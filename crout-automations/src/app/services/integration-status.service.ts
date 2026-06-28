import { Injectable } from '@angular/core';
import { IntegrationLifecycleStatus, UserServiceStatus } from '../interfaces/i-service.interface';

@Injectable({ providedIn: 'root' })
export class IntegrationStatusService {
  resolveStatus(integrationStatus?: IntegrationLifecycleStatus | null, legacyStatus?: UserServiceStatus | number | null): IntegrationLifecycleStatus | 'Disabled' | 'Pending' {
    if (integrationStatus) return integrationStatus;
    return legacyStatus === 2 ? 'Live'
      : legacyStatus === 1 ? 'Development'
      : legacyStatus === 0 ? 'Disabled'
      : 'Pending';
  }

  label(integrationStatus?: IntegrationLifecycleStatus | null, legacyStatus?: UserServiceStatus | number | null): string {
    const status = this.resolveStatus(integrationStatus, legacyStatus);
    return status === 'Development' ? 'Development' : status;
  }

  cssClass(integrationStatus?: IntegrationLifecycleStatus | null, legacyStatus?: UserServiceStatus | number | null): string {
    const status = this.resolveStatus(integrationStatus, legacyStatus);
    return {
      Disabled: 'status-disabled',
      Pending: 'status-pending',
      Development: 'status-dev',
      Live: 'status-live',
      Paused: 'status-paused',
      Failed: 'status-failed',
    }[status];
  }
}
