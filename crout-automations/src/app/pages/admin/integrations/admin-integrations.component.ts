import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminSidebarComponent } from '../../../components/admin-sidebar/admin-sidebar.component';
import { AuthService } from '../../../services/auth.service';
import { AdminService, PagedResult } from '../../../services/admin.service';
import { AdminIntegrationDraftService } from '../../../services/admin-integration-draft.service';
import { WorkflowCapabilityApiService } from '../../../services/workflow-capability-api.service';
import { IAddon } from '../../../interfaces/i-service.interface';
import { IWorkflowIntegrationDefinition } from '../../../interfaces/i-workflow-capability.interface';

@Component({
  selector: 'ca-admin-integrations',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent],
  templateUrl: './admin-integrations.component.html',
  styleUrls: ['../addons/admin-addons.component.scss'],
})
export class AdminIntegrationsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly admin = inject(AdminService);
  private readonly draftStore = inject(AdminIntegrationDraftService);
  private readonly workflowApi = inject(WorkflowCapabilityApiService);

  readonly integrations = signal<IWorkflowIntegrationDefinition[]>([]);
  readonly addons = signal<IAddon[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly editingIntegrationId = signal<number | null>(null);
  readonly showCreate = signal(false);
  readonly saving = signal(false);
  readonly integrationTypeOptions = ['Trigger', 'Action', 'Output'] as const;

  integrationDraft: Partial<IWorkflowIntegrationDefinition> = { name: '', integrationType: 'Action', hasCredentials: false, isActive: true };

  readonly addonNamesByIntegration = computed(() => {
    const map = new Map<number, string[]>();
    for (const addon of this.addons()) {
      for (const integration of addon.integrations ?? []) {
        const names = map.get(integration.id) ?? [];
        names.push(addon.addonName);
        map.set(integration.id, names);
      }
    }
    return map;
  });

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user?.isAdmin) {
      void this.router.navigate(['/client/dashboard']);
      return;
    }

    this.reload();
    this.restoreDraftIfNeeded();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);

    this.workflowApi.getAdminIntegrationDefinitions(false).subscribe({
      next: integrations => {
        this.integrations.set(integrations);
        this.admin.getAddons(1, 200).subscribe({
          next: (addons: PagedResult<IAddon>) => {
            this.addons.set(addons.items);
            this.loading.set(false);
          },
          error: () => {
            this.error.set('Failed to load add-on relationships.');
            this.loading.set(false);
          }
        });
      },
      error: () => {
        this.error.set('Failed to load integration definitions.');
        this.loading.set(false);
      }
    });
  }

  startEditIntegration(item: IWorkflowIntegrationDefinition): void {
    this.showCreate.set(false);
    this.editingIntegrationId.set(item.id);
    this.integrationDraft = {
      name: item.name,
      description: item.description ?? '',
      integrationType: item.integrationType,
      hasCredentials: item.hasCredentials,
      credentialFormSchema: item.credentialFormSchema ?? null,
      isActive: item.isActive,
    };
    this.persistDraft('edit');
  }

  cancelIntegrationEdit(): void {
    this.editingIntegrationId.set(null);
    this.showCreate.set(false);
    this.integrationDraft = { name: '', integrationType: 'Action', hasCredentials: false, isActive: true };
    this.draftStore.clearDraft();
  }

  openCreateIntegration(): void {
    this.editingIntegrationId.set(null);
    this.showCreate.set(true);
    this.integrationDraft = { name: '', integrationType: 'Action', hasCredentials: false, isActive: true };
    this.error.set(null);
    this.persistDraft('create');
  }

  saveIntegration(): void {
    this.saving.set(true);
    const request = this.editingIntegrationId()
      ? this.workflowApi.updateAdminIntegrationDefinition(this.editingIntegrationId()!, this.integrationDraft)
      : this.workflowApi.createAdminIntegrationDefinition(this.integrationDraft);

    request.subscribe({
      next: () => {
        this.cancelIntegrationEdit();
        this.reload();
        this.saving.set(false);
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'Failed to save integration definition.');
        this.saving.set(false);
      }
    });
  }

  deleteIntegration(id: number): void {
    this.workflowApi.deleteAdminIntegrationDefinition(id).subscribe({
      next: () => this.reload(),
      error: err => this.error.set(err?.error?.error ?? 'Failed to delete integration definition.')
    });
  }

  openCredentialBuilder(): void {
    this.persistDraft(this.editingIntegrationId() === null ? 'create' : 'edit');
    void this.router.navigate(['/admin/integrations/credentials-builder']);
  }

  addonNames(integrationId: number): string {
    return this.addonNamesByIntegration().get(integrationId)?.join(', ') ?? '—';
  }

  credentialFieldCount(): number {
    return this.integrationDraft.credentialFormSchema?.fields?.length ?? 0;
  }

  private restoreDraftIfNeeded(): void {
    if (this.route.snapshot.queryParamMap.get('resumeDraft') !== '1') return;

    const state = this.draftStore.getDraft();
    if (!state) return;

    this.integrationDraft = state.draft;
    this.editingIntegrationId.set(state.editingIntegrationId);
    this.showCreate.set(state.mode === 'create');
    this.error.set(null);

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { resumeDraft: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private persistDraft(mode: 'create' | 'edit'): void {
    this.draftStore.saveDraft({
      mode,
      editingIntegrationId: this.editingIntegrationId(),
      draft: structuredClone(this.integrationDraft),
    });
  }
}
