import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../../../../services/auth.service';
import { ApiService } from '../../../../services/api.service';
import { ToastService } from '../../../../services/toast.service';
import { IntegrationStatusService } from '../../../../services/integration-status.service';
import { IAddon, ICompany, IService, IUserService } from '../../../../interfaces/i-service.interface';
import { DynamicFieldConfig } from '../../../../interfaces/i-service-trigger.interface';
import { ServiceTriggerApiService } from '../../../../services/service-trigger-api.service';
import { ServiceTriggerRendererComponent } from '../../../../components/service-trigger-renderer/service-trigger-renderer.component';
import { IntegrationStatusBadgeComponent } from '../../../../components/integration-status-badge/integration-status-badge.component';
import { CustomFormSharePanelComponent } from '../../../../components/custom-form-share-panel/custom-form-share-panel.component';
import { MatIconModule } from '@angular/material/icon';
import { hasConfirmedCustomFormTriggerInConfig } from '../../../../shared/custom-form-eligibility.util';

interface WorkflowItem { addonId: number; name: string; confirmed: boolean; category: 'trigger' | 'action' | 'output'; }
interface CredentialOption { key: string; label: string; fields: DynamicFieldConfig[]; integrationName: string; linked: boolean; }

@Component({
  selector: 'ca-portal-service-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ServiceTriggerRendererComponent, IntegrationStatusBadgeComponent, CustomFormSharePanelComponent, MatIconModule],
  templateUrl: './portal-service-details.component.html',
  styleUrl: './portal-service-details.component.scss'
})
export class PortalServiceDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly triggersApi = inject(ServiceTriggerApiService);
  private readonly toast = inject(ToastService);
  private readonly integrationStatus = inject(IntegrationStatusService);

  readonly loading = signal(true);
  readonly company = signal<ICompany | null>(null);
  readonly userService = signal<IUserService | null>(null);
  readonly service = signal<IService | null>(null);
  readonly addons = signal<IAddon[]>([]);
  readonly workflowItems = signal<WorkflowItem[]>([]);
  readonly triggerConfigs = signal<any[]>([]);
  readonly triggersLoading = signal(false);
  readonly expandedCredentialKey = signal<string | null>(null);
  readonly credentialsDialogOpen = signal(false);
  readonly credentialSelectionKey = signal<string | null>(null);
  readonly credentialValues = signal<Record<string, string>>({});
  readonly savingCredentials = signal(false);
  readonly shareOpen = signal(false);

  readonly credentialOptions = computed<CredentialOption[]>(() => {
    const confirmed = new Set(this.workflowItems().filter(item => item.confirmed).map(item => item.name.trim().toLowerCase()));
    return this.addons().flatMap(addon => confirmed.has(addon.addonName.trim().toLowerCase())
      ? (addon.integrations ?? []).filter(integration => integration.hasCredentials && integration.credentialFormSchema?.fields?.length).map(integration => ({
          key: `integration:${integration.id}`,
          label: integration.name,
          fields: integration.credentialFormSchema!.fields,
          integrationName: integration.name,
          linked: true,
        }))
      : []);
  });

  readonly selectedCredential = computed(() => this.credentialOptions().find(option => option.key === this.credentialSelectionKey()) ?? null);

  ngOnInit(): void {
    const userServiceId = Number(this.route.snapshot.paramMap.get('userServiceId'));
    const userId = this.auth.currentUser()?.userId;
    if (!Number.isInteger(userServiceId) || userServiceId <= 0 || userId == null) { this.loading.set(false); return; }

    forkJoin({ services: this.api.getServices(), companies: this.api.getCompaniesByUser(userId) }).pipe(
      switchMap(({ services, companies }) => companies.length
        ? forkJoin({ services: of(services), companies: of(companies), assignments: forkJoin(companies.map(company => this.api.getCompanyServices(company.companyId))) })
        : of({ services, companies, assignments: [] as IUserService[][] }))
    ).subscribe({
      next: ({ services, companies, assignments }) => {
        const companyIndex = assignments.findIndex(items => items.some(item => item.userServiceId === userServiceId));
        const assignment = companyIndex >= 0 ? assignments[companyIndex].find(item => item.userServiceId === userServiceId) ?? null : null;
        const selectedCompany = companyIndex >= 0 ? companies[companyIndex] ?? null : null;
        const selectedService = assignment ? services.find(item => item.serviceId === assignment.serviceId) ?? null : null;
        this.company.set(selectedCompany);
        this.userService.set(assignment);
        this.service.set(selectedService);
        if (assignment && selectedService && selectedCompany) this.loadDetailData(assignment, selectedService, selectedCompany);
        else this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  toggleCredential(option: CredentialOption): void {
    this.expandedCredentialKey.update(current => current === option.key ? null : option.key);
  }

  openCredentials(option: CredentialOption): void {
    this.credentialSelectionKey.set(option.key);
    this.credentialValues.set({});
    this.credentialsDialogOpen.set(true);
  }

  closeCredentials(): void { this.credentialsDialogOpen.set(false); this.credentialValues.set({}); }

  setCredentialField(key: string, value: string): void {
    this.credentialValues.update(current => ({ ...current, [key]: value }));
  }

  credentialInputType(field: DynamicFieldConfig): string {
    return field.type === 'password' ? 'password' : field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text';
  }

  submitCredentials(): void {
    const assignment = this.userService();
    const option = this.selectedCredential();
    if (!assignment?.userServiceId || !option) return;
    const fields = Object.entries(this.credentialValues()).reduce((result, [key, value]) => {
      if (key.trim() && value.trim()) result[key] = value.trim();
      return result;
    }, {} as Record<string, string>);
    this.savingCredentials.set(true);
    this.api.updateServiceCredentials(assignment.userServiceId, { integrationName: option.integrationName, fields }).subscribe({
      next: updated => { this.userService.set(updated); this.savingCredentials.set(false); this.closeCredentials(); this.toast.success('Credentials saved.'); },
      error: error => { this.savingCredentials.set(false); this.toast.error(error?.error?.error ?? 'Credentials could not be saved.'); }
    });
  }

  isShareEligible(): boolean {
    return hasConfirmedCustomFormTriggerInConfig(this.userService()?.config);
  }

  openShare(): void { this.shareOpen.set(true); }
  closeShare(): void { this.shareOpen.set(false); }

  statusLabel(): string { const item = this.userService(); return item ? this.integrationStatus.label(null, item.status) : ''; }
  workflowLabel(item: WorkflowItem): string { return item.category === 'trigger' ? 'Trigger' : item.category === 'output' ? 'Output' : 'Action'; }

  private loadDetailData(assignment: IUserService, service: IService, company: ICompany): void {
    forkJoin({ addons: this.api.getAddonsByService(service.serviceId), triggers: this.triggersApi.getConfigs(company.companyId, service.serviceId, assignment.userServiceId) }).subscribe({
      next: ({ addons, triggers }) => {
        this.addons.set(addons);
        this.workflowItems.set(this.parseConfig(assignment.config, addons));
        this.triggerConfigs.set(triggers);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); }
    });
  }

  private parseConfig(config: string | null | undefined, addons: IAddon[]): WorkflowItem[] {
    if (!config) return [];
    try {
      const parsed = JSON.parse(config);
      const entries = Array.isArray(parsed.confirmedAddons) ? parsed.confirmedAddons : Array.isArray(parsed.requestedAddons) ? parsed.requestedAddons : [];
      if (entries.length) return entries.map((item: any) => ({ addonId: Number(item.addonId ?? 0), name: String(item.name ?? ''), confirmed: item.confirmed !== false, category: this.category(item.type ?? item.category) })).filter((item: WorkflowItem) => item.name);
      return (Array.isArray(parsed.addonIds) ? parsed.addonIds : []).map((id: number) => addons.find(addon => addon.addonId === id)).filter(Boolean).map((addon: IAddon) => ({ addonId: addon.addonId, name: addon.addonName, confirmed: false, category: this.category(addon.type) }));
    } catch { return []; }
  }

  private category(value: unknown): 'trigger' | 'action' | 'output' { const normalized = String(value ?? '').toLowerCase(); return normalized === 'trigger' || normalized === 'output' ? normalized : 'action'; }
}
