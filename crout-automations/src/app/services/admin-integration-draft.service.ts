import { Injectable } from '@angular/core';
import { IWorkflowIntegrationDefinition } from '../interfaces/i-workflow-capability.interface';

interface AdminIntegrationDraftState {
  mode: 'create' | 'edit';
  editingIntegrationId: number | null;
  draft: Partial<IWorkflowIntegrationDefinition>;
}

@Injectable({ providedIn: 'root' })
export class AdminIntegrationDraftService {
  private readonly storageKey = 'ca_admin_integration_draft';

  getDraft(): AdminIntegrationDraftState | null {
    if (typeof sessionStorage === 'undefined') return null;

    const raw = sessionStorage.getItem(this.storageKey);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as AdminIntegrationDraftState;
    } catch {
      sessionStorage.removeItem(this.storageKey);
      return null;
    }
  }

  saveDraft(state: AdminIntegrationDraftState): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  clearDraft(): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(this.storageKey);
  }
}
