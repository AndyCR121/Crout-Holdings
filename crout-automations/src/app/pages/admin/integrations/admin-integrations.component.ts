import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AdminService, PagedResult } from '../../../services/admin.service';
import { AdminIntegrationDraftService } from '../../../services/admin-integration-draft.service';
import { IntegrationDefinitionApiService } from '../../../services/integration-definition-api.service';
import { IAddon } from '../../../interfaces/i-service.interface';
import { IIntegrationDefinition } from '../../../interfaces/i-integration-definition.interface';

@Component({
  selector: 'ca-admin-integrations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-integrations.component.html',
  styleUrls: ['../addons/admin-addons.component.scss'],
})
export class AdminIntegrationsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly admin = inject(AdminService);
  private readonly draftStore = inject(AdminIntegrationDraftService);
  private readonly integrationsApi = inject(IntegrationDefinitionApiService);

  readonly integrations = signal<IIntegrationDefinition[]>([]);
  readonly addons = signal<IAddon[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly editingIntegrationId = signal<number | null>(null);
  readonly showCreate = signal(false);
  readonly saving = signal(false);
  readonly page = signal(1);
  readonly pageSize = 10;
  readonly integrationTypeOptions = ['Trigger', 'Action', 'Output'] as const;

  integrationDraft: Partial<IIntegrationDefinition> = { name: '', integrationType: 'Action', hasCredentials: false, isActive: true };

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

  readonly filteredIntegrations = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    if (!query) return this.integrations();

    return this.integrations().filter(integration => {
      const addonNames = this.addonNamesByIntegration().get(integration.id)?.join(' ') ?? '';
      return [
        integration.name,
        integration.integrationType,
        integration.description ?? '',
        integration.hasCredentials ? 'yes' : 'no',
        integration.isActive ? 'yes' : 'no',
        addonNames,
      ].some(value => value.toLowerCase().includes(query));
    });
  });

  readonly pagedIntegrations = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredIntegrations().slice(start, start + this.pageSize);
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredIntegrations().length / this.pageSize)));
  readonly hasMore = computed(() => this.page() < this.totalPages());

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

    this.integrationsApi.getAdminIntegrationDefinitions(false).subscribe({
      next: integrations => {
        this.integrations.set(integrations);
        this.page.set(1);
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

  startEditIntegration(item: IIntegrationDefinition): void {
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
      ? this.integrationsApi.updateAdminIntegrationDefinition(this.editingIntegrationId()!, this.integrationDraft)
      : this.integrationsApi.createAdminIntegrationDefinition(this.integrationDraft);

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
    this.integrationsApi.deleteAdminIntegrationDefinition(id).subscribe({
      next: () => this.reload(),
      error: err => this.error.set(err?.error?.error ?? 'Failed to delete integration definition.')
    });
  }

  updateSearch(term: string): void {
    this.searchTerm.set(term);
    this.page.set(1);
  }

  prevPage(): void {
    if (this.page() > 1) {
      this.page.update(page => page - 1);
    }
  }

  nextPage(): void {
    if (this.hasMore()) {
      this.page.update(page => page + 1);
    }
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
