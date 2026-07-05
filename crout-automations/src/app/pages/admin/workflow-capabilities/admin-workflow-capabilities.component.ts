import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';
import { WorkflowCapabilityApiService } from '../../../services/workflow-capability-api.service';
import { IService } from '../../../interfaces/i-service.interface';
import { IServiceWorkflowCapability, IWorkflowIntegrationDefinition } from '../../../interfaces/i-workflow-capability.interface';

@Component({
  selector: 'ca-admin-workflow-capabilities',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-workflow-capabilities.component.html',
  styleUrls: ['../addons/admin-addons.component.scss'],
})
export class AdminWorkflowCapabilitiesComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly admin = inject(AdminService);
  private readonly workflowApi = inject(WorkflowCapabilityApiService);

  readonly services = signal<IService[]>([]);
  readonly selectedServiceId = signal<number | null>(null);
  readonly capabilities = signal<IServiceWorkflowCapability[]>([]);
  readonly integrations = signal<IWorkflowIntegrationDefinition[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly editingCapabilityId = signal<number | null>(null);
  readonly editingIntegrationId = signal<number | null>(null);
  readonly showCapabilityDialog = signal(false);
  readonly showIntegrationDialog = signal(false);
  readonly saving = signal(false);

  capabilityDraft: Partial<IServiceWorkflowCapability> = { role: 'Trigger', capabilityType: '', name: '', price: 0, displayOrder: 0, isActive: true, requiresCredentials: false };
  integrationDraft: Partial<IWorkflowIntegrationDefinition> = { name: '', integrationType: '', hasCredentials: false, isActive: true };

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user?.isAdmin) {
      void this.router.navigate(['/client/dashboard']);
      return;
    }

    this.admin.getServices(1, 100).subscribe({
      next: services => {
        this.services.set(services);
        this.selectedServiceId.set(services[0]?.serviceId ?? null);
        this.reload();
      },
      error: () => {
        this.error.set('Failed to load services.');
        this.loading.set(false);
      }
    });
  }

  reload(): void {
    const serviceId = this.selectedServiceId();
    if (!serviceId) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.workflowApi.getAdminIntegrationDefinitions(false).subscribe({
      next: integrations => {
        this.integrations.set(integrations);
        this.workflowApi.getAdminServiceCapabilities(serviceId, false).subscribe({
          next: capabilities => {
            this.capabilities.set(capabilities);
            this.loading.set(false);
          },
          error: () => {
            this.error.set('Failed to load workflow capabilities.');
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

  startEditCapability(item: IServiceWorkflowCapability): void {
    this.showCapabilityDialog.set(true);
    this.editingCapabilityId.set(item.id);
    this.capabilityDraft = {
      serviceId: item.serviceId,
      role: item.role,
      capabilityType: item.capabilityType,
      name: item.name,
      description: item.description ?? '',
      price: item.price,
      displayOrder: item.displayOrder,
      isActive: item.isActive,
      integrationId: item.integrationId,
      requiresCredentials: item.requiresCredentials,
      configurationSchema: item.configurationSchema ?? null,
    };
  }

  startEditIntegration(item: IWorkflowIntegrationDefinition): void {
    this.showIntegrationDialog.set(true);
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

  cancelCapabilityEdit(): void {
    this.showCapabilityDialog.set(false);
    this.editingCapabilityId.set(null);
    this.capabilityDraft = { role: 'Trigger', capabilityType: '', name: '', price: 0, displayOrder: 0, isActive: true, requiresCredentials: false };
  }

  cancelIntegrationEdit(): void {
    this.showIntegrationDialog.set(false);
    this.editingIntegrationId.set(null);
    this.integrationDraft = { name: '', integrationType: '', hasCredentials: false, isActive: true };
  }

  openCreateCapability(): void {
    this.cancelCapabilityEdit();
    this.showCapabilityDialog.set(true);
  }

  openCreateIntegration(): void {
    this.cancelIntegrationEdit();
    this.showIntegrationDialog.set(true);
  }

  saveCapability(): void {
    const serviceId = this.selectedServiceId();
    if (!serviceId) return;
    this.saving.set(true);
    const request = this.editingCapabilityId()
      ? this.workflowApi.updateAdminServiceCapability(this.editingCapabilityId()!, { ...this.capabilityDraft, serviceId })
      : this.workflowApi.createAdminServiceCapability(serviceId, { ...this.capabilityDraft, serviceId });

    request.subscribe({
      next: () => {
        this.cancelCapabilityEdit();
        this.reload();
        this.saving.set(false);
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'Failed to save capability.');
        this.saving.set(false);
      }
    });
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

  deleteCapability(id: number): void {
    this.workflowApi.deleteAdminServiceCapability(id).subscribe({
      next: () => this.reload(),
      error: err => this.error.set(err?.error?.error ?? 'Failed to delete capability.')
    });
  }

  deleteIntegration(id: number): void {
    this.workflowApi.deleteAdminIntegrationDefinition(id).subscribe({
      next: () => this.reload(),
      error: err => this.error.set(err?.error?.error ?? 'Failed to delete integration definition.')
    });
  }

  updateCapabilitySchema(value: string): void {
    try {
      this.capabilityDraft.configurationSchema = value.trim() ? JSON.parse(value) : null;
      this.error.set(null);
    } catch {
      this.error.set('Capability configuration schema must be valid JSON.');
    }
  }

  updateIntegrationSchema(value: string): void {
    try {
      this.integrationDraft.credentialFormSchema = value.trim() ? JSON.parse(value) : null;
      this.error.set(null);
    } catch {
      this.error.set('Credential schema must be valid JSON.');
    }
  }
}
