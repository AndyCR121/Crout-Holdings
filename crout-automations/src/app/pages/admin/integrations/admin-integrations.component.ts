import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminSidebarComponent } from '../../../components/admin-sidebar/admin-sidebar.component';
import { AuthService } from '../../../services/auth.service';
import { AdminService, SqlUpdaterSummary } from '../../../services/admin.service';
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
  private readonly router = inject(Router);
  private readonly admin = inject(AdminService);
  private readonly workflowApi = inject(WorkflowCapabilityApiService);

  readonly integrations = signal<IWorkflowIntegrationDefinition[]>([]);
  readonly addons = signal<IAddon[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly editingIntegrationId = signal<number | null>(null);
  readonly saving = signal(false);
  readonly confirmingUpdater = signal(false);
  readonly runningUpdater = signal(false);
  readonly updaterSummary = signal<SqlUpdaterSummary | null>(null);

  integrationDraft: Partial<IWorkflowIntegrationDefinition> = { name: '', integrationType: '', hasCredentials: false, isActive: true };

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
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);

    this.workflowApi.getAdminIntegrationDefinitions(false).subscribe({
      next: integrations => {
        this.integrations.set(integrations);
        this.admin.getAddons(1, 200).subscribe({
          next: addons => {
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
    this.editingIntegrationId.set(item.id);
    this.integrationDraft = {
      name: item.name,
      description: item.description ?? '',
      integrationType: item.integrationType,
      hasCredentials: item.hasCredentials,
      credentialFormSchema: item.credentialFormSchema ?? null,
      isActive: item.isActive,
    };
  }

  cancelIntegrationEdit(): void {
    this.editingIntegrationId.set(null);
    this.integrationDraft = { name: '', integrationType: '', hasCredentials: false, isActive: true };
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

  updateIntegrationSchema(value: string): void {
    try {
      this.integrationDraft.credentialFormSchema = value.trim() ? JSON.parse(value) : null;
      this.error.set(null);
    } catch {
      this.error.set('Credential schema must be valid JSON.');
    }
  }

  openUpdaterConfirmation(): void {
    this.confirmingUpdater.set(true);
    this.error.set(null);
  }

  cancelUpdaterConfirmation(): void {
    this.confirmingUpdater.set(false);
  }

  runSqlUpdater(): void {
    this.runningUpdater.set(true);
    this.confirmingUpdater.set(false);
    this.error.set(null);

    this.admin.runSqlUpdater(true).subscribe({
      next: summary => {
        this.updaterSummary.set(summary);
        this.runningUpdater.set(false);
        if (summary.success) {
          this.reload();
          return;
        }

        this.error.set(summary.errorMessage ?? 'SQL updater failed.');
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'Failed to run SQL updater.');
        this.runningUpdater.set(false);
      }
    });
  }

  addonNames(integrationId: number): string {
    return this.addonNamesByIntegration().get(integrationId)?.join(', ') ?? '—';
  }
}
