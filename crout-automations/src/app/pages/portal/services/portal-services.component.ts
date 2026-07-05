import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../services/toast.service';
import { IUserService, IService, IAddon, ICompany } from '../../../interfaces/i-service.interface';
import { PortalSidebarComponent } from '../../../components/portal-sidebar/portal-sidebar.component';
import { ServiceTriggerRendererComponent } from '../../../components/service-trigger-renderer/service-trigger-renderer.component';
import { MarketingWorkspaceComponent } from '../../../components/marketing-workspace/marketing-workspace.component';
import { DynamicFieldConfig, ServiceTriggerConfig } from '../../../interfaces/i-service-trigger.interface';
import { ServiceTriggerApiService } from '../../../services/service-trigger-api.service';
import { IntegrationStatusBadgeComponent } from '../../../components/integration-status-badge/integration-status-badge.component';
import { IntegrationStatusService } from '../../../services/integration-status.service';
import { ICredentialFieldState, IServiceWorkflowCapability, IUserServiceWorkflowStep } from '../../../interfaces/i-workflow-capability.interface';
import { WorkflowCapabilityApiService } from '../../../services/workflow-capability-api.service';

interface IntegrationItem {
  name: string;
  confirmed: boolean;
  category: 'trigger' | 'action' | 'output';
}

interface ServiceRow {
  userService:   IUserService;
  service:       IService;
  addons:        IAddon[];
  activeAddons:  IntegrationItem[];
  editing:       boolean;
  availableCapabilities: IServiceWorkflowCapability[];
  selectedCapabilityIds: number[];
  capabilitiesLoading: boolean;
  sidePanelOpen: boolean;
  credentialsOpen: boolean;
  credentialSelectionKey: string | null;
  credentialValues: Record<string, string>;
  workflowSteps: IUserServiceWorkflowStep[];
  workflowStepsLoading: boolean;
  triggerConfigs: ServiceTriggerConfig[];
  triggersLoading: boolean;
  workspaceView: 'marketing' | 'manual';
}

interface CompanyGroup {
  company:  ICompany;
  rows:     ServiceRow[];
  expanded: boolean;
}

interface CredentialFormOption {
  key: string;
  label: string;
  fields: DynamicFieldConfig[];
  stepId?: number;
  integrationName?: string;
  fieldStates?: Record<string, ICredentialFieldState> | null;
}

@Component({
  selector: 'ca-portal-services',
  standalone: true,
  imports: [CommonModule, FormsModule, PortalSidebarComponent, ServiceTriggerRendererComponent, MarketingWorkspaceComponent, IntegrationStatusBadgeComponent],
  templateUrl: './portal-services.component.html',
  styleUrls: ['./portal-services.component.scss'],
})
export class PortalServicesComponent implements OnInit, OnDestroy {
  private readonly auth  = inject(AuthService);
  private readonly api   = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly triggersApi = inject(ServiceTriggerApiService);
  private readonly integrationStatus = inject(IntegrationStatusService);
  private readonly workflowApi = inject(WorkflowCapabilityApiService);

  readonly user    = computed(() => this.auth.currentUser());
  readonly groups  = signal<CompanyGroup[]>([]);
  readonly loading = signal(true);
  readonly saving  = signal<number | null>(null);
  readonly savingCredentials = signal<number | null>(null);

  ngOnInit(): void {
    const uid = this.user()?.userId;
    if (uid == null) { this.loading.set(false); return; }

    forkJoin({
      svcs:      this.api.getServices(),
      companies: this.api.getCompaniesByUser(uid),
    }).pipe(
      switchMap(({ svcs, companies }) => {
        if (!companies.length) {
          return of({ svcs, companies, companyServices: [] as IUserService[][], addons: [] as IAddon[][] });
        }
        return forkJoin({
          svcs:            of(svcs),
          companies:       of(companies),
          companyServices: forkJoin(companies.map((c: ICompany) => this.api.getCompanyServices(c.companyId))),
          addons:          svcs.length
            ? forkJoin(svcs.map((s: IService) => this.api.getAddonsByService(s.serviceId)))
            : of([] as IAddon[][]),
        });
      })
    ).subscribe({
      next: ({ svcs, companies, companyServices, addons }) => {
        const allAddons: IAddon[] = (addons as IAddon[][]).flat();

        const built: CompanyGroup[] = (companies as ICompany[]).map((company: ICompany, ci: number) => {
          const us: IUserService[] = (companyServices as IUserService[][])[ci] ?? [];
          const rows: ServiceRow[] = us.map((u: IUserService) => {
            const svc       = (svcs as IService[]).find((s: IService) => s.serviceId === u.serviceId)!;
            const rowAddons = allAddons.filter((a: IAddon) => (a.serviceIds?.length ? a.serviceIds.includes(u.serviceId) : a.serviceId === u.serviceId));
            const active    = this._parseConfig(u.config, allAddons);
            const selectedAddonIds = this._parseAddonIds(u.config, active, rowAddons);
            return {
              userService:   u,
              service:       svc,
              addons:        rowAddons,
              activeAddons:  active,
              editing:       false,
              availableCapabilities: [],
              selectedCapabilityIds: selectedAddonIds,
              capabilitiesLoading: false,
              sidePanelOpen: false,
              credentialsOpen: false,
              credentialSelectionKey: null,
              credentialValues: {},
              workflowSteps: [],
              workflowStepsLoading: false,
              triggerConfigs: [],
              triggersLoading: false,
              workspaceView: svc.serviceName.toLowerCase() === 'marketing systems' ? 'marketing' : 'manual',
            };
          });
          return { company, rows, expanded: true };
        });

        built.sort((a, b) => a.company.companyId - b.company.companyId);
        this.groups.set(built);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  ngOnDestroy(): void {
    this.unlockDrawerScroll();
  }

  private _parseConfig(cfg: string | null | undefined, allAddons: IAddon[]): IntegrationItem[] {
    if (!cfg) return [];
    try {
      const parsed = JSON.parse(cfg);
      const confirmedAddons = Array.isArray(parsed.confirmedAddons) ? parsed.confirmedAddons : [];
      if (confirmedAddons.length > 0) {
        return confirmedAddons
          .map((item: any) => ({
            name: String(item.name ?? ''),
            confirmed: item.confirmed !== false,
            category: this.asCategory(String(item.type ?? item.category ?? 'action').toLowerCase())
          }))
          .filter((item: IntegrationItem) => item.name);
      }

      const requestedAddons = Array.isArray(parsed.requestedAddons) ? parsed.requestedAddons : [];
      if (requestedAddons.length > 0) {
        return requestedAddons
          .map((item: any) => ({
            name: String(item.name ?? ''),
            confirmed: item.confirmed === true,
            category: this.asCategory(String(item.type ?? item.category ?? 'action').toLowerCase())
          }))
          .filter((item: IntegrationItem) => item.name);
      }

      const raw = parsed.integrations ?? [];
      if (Array.isArray(raw) && raw.length > 0) {
        return raw
          .map((item: any) => typeof item === 'string'
            ? { name: item, confirmed: true, category: this.classifyIntegration(item) }
            : {
                name: String(item.name ?? ''),
                confirmed: item.confirmed === true,
                category: this.asCategory(item.category)
              })
          .filter((item: IntegrationItem) => item.name);
      }

      const addonIds = Array.isArray(parsed.addonIds) ? parsed.addonIds : [];
      return addonIds
        .map((id: number) => allAddons.find(a => a.addonId === id))
        .filter((a: IAddon | undefined): a is IAddon => !!a)
        .map((a: IAddon) => ({ name: a.addonName, confirmed: false, category: this.classifyIntegration(a.addonName) }));
    } catch {
      return [];
    }
  }

  private _integrationLabel(item: unknown): string | null {
    if (typeof item === 'string') return item;
    if (item == null || typeof item !== 'object') return null;

    const record = item as Record<string, any>;
    const nestedAddon = record['addon'];
    if (nestedAddon && typeof nestedAddon === 'object') {
      const nested = nestedAddon as Record<string, any>;
      return nested['addonName'] ?? nested['AddonName'] ?? nested['name'] ?? nested['label'] ?? null;
    }

    return record['addonName'] ?? record['AddonName'] ?? record['name'] ?? record['label'] ?? record['serviceName'] ?? null;
  }
  
  private _parseAddonIds(cfg: string | null | undefined, active: IntegrationItem[], rowAddons: IAddon[]): number[] {
    if (cfg) {
      try {
        const parsed = JSON.parse(cfg);
        if (Array.isArray(parsed.addonIds)) return parsed.addonIds;
      } catch { /* fall through */ }
    }
    const selected = new Set(active.map(i => i.name.toLowerCase()));
    return rowAddons.filter(a => selected.has(a.addonName.toLowerCase())).map(a => a.addonId);
  }

  toggleGroup(group: CompanyGroup): void {
    group.expanded = !group.expanded;
    this.groups.update(g => [...g]);
  }

  startEdit(row: ServiceRow): void {
    row.editing = true;
    this.loadCapabilitiesForRow(row);
    this.groups.update(g => [...g]);
  }

  cancelEdit(row: ServiceRow): void {
    row.editing = false;
    this.groups.update(g => [...g]);
  }

  toggleCapability(row: ServiceRow, capabilityId: number): void {
    const idx = row.selectedCapabilityIds.indexOf(capabilityId);
    if (idx > -1) row.selectedCapabilityIds.splice(idx, 1);
    else row.selectedCapabilityIds.push(capabilityId);
    this.groups.update(g => [...g]);
  }

  submitConfigRequest(row: ServiceRow): void {
    const userServiceId = row.userService.userServiceId;
    if (userServiceId == null) {
      this.toast.error('Configuration request could not be submitted because this service is missing its assignment id.');
      return;
    }

    this.saving.set(userServiceId);
    this.workflowApi.saveRequestedSelection(userServiceId, row.selectedCapabilityIds).subscribe({
      next: steps => {
        row.workflowSteps = steps;
        row.activeAddons = steps
          .filter(step => step.status !== 'Disabled')
          .map(step => ({
            name: step.capabilityName,
            confirmed: step.status === 'Confirmed',
            category: step.role === 'Trigger' ? 'trigger' : step.role === 'Output' ? 'output' : 'action'
          }));
        row.editing = false;
        this.saving.set(null);
        this.groups.update(g => [...g]);
        this.toast.success(`Configuration request submitted for ${row.service.serviceName}.`);
      },
      error: err => {
        this.saving.set(null);
        this.toast.error(err?.error?.error ?? 'Configuration request could not be submitted.');
      }
    });
  }

  openSidePanel(row: ServiceRow, company?: ICompany): void {
    row.sidePanelOpen = true;
    this.lockDrawerScroll();
    this.loadTriggers(row, company);
    this.loadWorkflowSteps(row);
    this.groups.update(g => [...g]);
  }

  closeSidePanel(row: ServiceRow): void {
    row.sidePanelOpen = false;
    this.groups.update(g => [...g]);
    if (!this.hasOpenSidePanel()) this.unlockDrawerScroll();
  }

  openCredentials(row: ServiceRow): void {
    row.sidePanelOpen = true;
    row.credentialsOpen = true;
    this.ensureCredentialSelection(row);
    this.lockDrawerScroll();
    this.loadWorkflowSteps(row);
    this.groups.update(g => [...g]);
  }

  onTriggerExecuted(): void {
    this.toast.success('Service trigger sent.');
  }

  cancelCredentials(row: ServiceRow): void {
    row.credentialsOpen = false;
    row.credentialValues = {};
    this.groups.update(g => [...g]);
  }

  submitCredentials(row: ServiceRow): void {
    const userServiceId = row.userService.userServiceId;
    if (userServiceId == null) {
      this.toast.error('Credentials could not be submitted because this service is missing its assignment id.');
      return;
    }

    const selectedOption = this.selectedCredentialOption(row);
    if (!selectedOption) {
      this.toast.error('Select a workflow credential form first.');
      return;
    }
    const fields = Object.entries(row.credentialValues)
      .reduce((acc, [key, value]) => {
        if (key.trim() && value.trim()) acc[key] = value.trim();
        return acc;
      }, {} as Record<string, string>);

    this.savingCredentials.set(userServiceId);
    if (selectedOption.stepId) {
      this.workflowApi.updateStepCredentials(userServiceId, selectedOption.stepId, fields).subscribe({
        next: updatedStep => {
          row.workflowSteps = row.workflowSteps.map(item => item.id === updatedStep.id ? updatedStep : item);
          row.credentialsOpen = false;
          row.credentialValues = {};
          this.savingCredentials.set(null);
          this.groups.update(g => [...g]);
          this.toast.success('Credentials saved.');
        },
        error: err => {
          this.savingCredentials.set(null);
          this.toast.error(err?.error?.error ?? 'Credentials could not be submitted.');
        },
      });
      return;
    }

    this.api.updateServiceCredentials(userServiceId, {
      integrationName: selectedOption.integrationName ?? '',
      fields
    }).subscribe({
      next: () => {
        row.credentialsOpen = false;
        row.credentialValues = {};
        this.savingCredentials.set(null);
        this.groups.update(g => [...g]);
        this.toast.success('Credentials saved.');
      },
      error: err => {
        this.savingCredentials.set(null);
        this.toast.error(err?.error?.error ?? 'Credentials could not be submitted.');
      },
    });
  }

  isMarketingSystem(row: ServiceRow): boolean {
    return row.service.serviceName.toLowerCase() === 'marketing systems';
  }

  setWorkspaceView(row: ServiceRow, view: 'marketing' | 'manual'): void {
    row.workspaceView = view;
    this.groups.update(g => [...g]);
  }

  statusLabel(s: number): string {
    return this.integrationStatus.label(null, s);
  }

  statusClass(s: number): string {
    return this.integrationStatus.cssClass(null, s);
  }

  hasAnyService(): boolean {
    return this.groups().some(g => g.rows.length > 0);
  }

  groupedCapabilities(row: ServiceRow, role: 'Trigger' | 'Action' | 'Output'): IServiceWorkflowCapability[] {
    return row.availableCapabilities.filter(capability => capability.role === role);
  }

  isCapabilitySelected(row: ServiceRow, capabilityId: number): boolean {
    return row.selectedCapabilityIds.includes(capabilityId);
  }

  activeWorkflowItems(row: ServiceRow, category: 'trigger' | 'action' | 'output'): IntegrationItem[] {
    return row.activeAddons.filter(item => item.category === category);
  }

  workflowCategoryLabel(category: 'trigger' | 'action' | 'output'): string {
    return category === 'trigger' ? 'Trigger' : category === 'output' ? 'Output' : 'Action';
  }

  private classifyIntegration(name: string): 'trigger' | 'action' | 'output' {
    const lower = name.toLowerCase();
    if (lower.includes('webhook') || lower.includes('email') || lower.includes('whatsapp') || lower.includes('form')) return 'trigger';
    if (lower.includes('report') || lower.includes('dashboard') || lower.includes('output') || lower.includes('invoice')) return 'output';
    return 'action';
  }

  private asCategory(value: string): 'trigger' | 'action' | 'output' {
    return value === 'trigger' || value === 'output' ? value : 'action';
  }

  private loadTriggers(row: ServiceRow, company?: ICompany): void {
    const companyId = company?.companyId ?? row.userService.companyId;
    if (!companyId || !row.service.serviceId || row.triggersLoading || row.triggerConfigs.length) return;

    row.triggersLoading = true;
    this.triggersApi.getConfigs(companyId, row.service.serviceId, row.userService.userServiceId).subscribe({
      next: configs => {
        row.triggerConfigs = configs;
        row.triggersLoading = false;
        this.groups.update(g => [...g]);
      },
      error: () => {
        row.triggerConfigs = [];
        row.triggersLoading = false;
        this.groups.update(g => [...g]);
      }
    });
  }

  private loadWorkflowSteps(row: ServiceRow): void {
    const userServiceId = row.userService.userServiceId;
    if (userServiceId == null || row.workflowStepsLoading) return;

    row.workflowStepsLoading = true;
    this.workflowApi.getWorkflowSteps(userServiceId).subscribe({
      next: steps => {
        row.workflowSteps = steps;
        row.workflowStepsLoading = false;
        this.ensureCredentialSelection(row);
        this.groups.update(g => [...g]);
      },
      error: () => {
        row.workflowStepsLoading = false;
        row.workflowSteps = [];
        this.groups.update(g => [...g]);
      }
    });
  }

  private loadCapabilitiesForRow(row: ServiceRow): void {
    if (row.capabilitiesLoading || row.availableCapabilities.length) return;
    row.capabilitiesLoading = true;
    const userServiceId = row.userService.userServiceId;

    forkJoin({
      capabilities: this.workflowApi.getServiceCapabilities(row.service.serviceId, true),
      steps: userServiceId ? this.workflowApi.getWorkflowSteps(userServiceId) : of([] as IUserServiceWorkflowStep[])
    }).subscribe({
      next: ({ capabilities, steps }) => {
        row.availableCapabilities = capabilities;
        row.workflowSteps = steps;
        row.selectedCapabilityIds = steps
          .filter(step => step.status === 'Pending' || step.status === 'Confirmed')
          .map(step => step.serviceWorkflowCapabilityId);
        row.capabilitiesLoading = false;
        this.groups.update(g => [...g]);
      },
      error: () => {
        row.capabilitiesLoading = false;
        this.groups.update(g => [...g]);
      }
    });
  }

  credentialSteps(row: ServiceRow): IUserServiceWorkflowStep[] {
    return row.workflowSteps.filter(step => step.requiresCredentials && step.status !== 'Disabled');
  }

  credentialOptions(row: ServiceRow): CredentialFormOption[] {
    const options: CredentialFormOption[] = [];
    const seenIntegrationNames = new Set<string>();

    for (const step of this.credentialSteps(row)) {
      const fields = step.credentialSchema?.fields ?? [];
      if (!fields.length) continue;
      if (step.integrationName) {
        seenIntegrationNames.add(step.integrationName.trim().toLowerCase());
      }
      options.push({
        key: `step:${step.id}`,
        label: step.integrationName ? `${step.capabilityName} · ${step.integrationName}` : step.capabilityName,
        fields,
        stepId: step.id,
        integrationName: step.integrationName ?? undefined,
        fieldStates: step.credentialFieldStates ?? null,
      });
    }

    for (const addon of this.credentialSourceAddons(row)) {
      for (const integration of addon.integrations ?? []) {
        const normalizedName = integration.name.trim().toLowerCase();
        if (!integration.hasCredentials || !integration.credentialFormSchema?.fields?.length || seenIntegrationNames.has(normalizedName)) {
          continue;
        }

        seenIntegrationNames.add(normalizedName);
        options.push({
          key: `integration:${integration.id}`,
          label: `${addon.addonName} · ${integration.name}`,
          fields: integration.credentialFormSchema.fields,
          integrationName: integration.name,
        });
      }
    }

    return options;
  }

  credentialSchema(row: ServiceRow): DynamicFieldConfig[] {
    return this.selectedCredentialOption(row)?.fields ?? [];
  }

  credentialPlaceholder(row: ServiceRow, field: DynamicFieldConfig): string {
    const state = this.selectedCredentialOption(row)?.fieldStates?.[field.key];
    return state?.hasStoredValue ? state.displayValue ?? 'Saved' : field.placeholder ?? '';
  }

  credentialInputType(field: DynamicFieldConfig): string {
    if (field.type === 'password') return 'password';
    if (field.type === 'email') return 'email';
    if (field.type === 'number') return 'number';
    if (field.type === 'url') return 'url';
    return 'text';
  }

  private selectedCredentialOption(row: ServiceRow): CredentialFormOption | null {
    return this.credentialOptions(row).find(option => option.key === row.credentialSelectionKey) ?? null;
  }

  private ensureCredentialSelection(row: ServiceRow): void {
    const options = this.credentialOptions(row);
    if (options.length === 0) {
      row.credentialSelectionKey = null;
      return;
    }

    const stillExists = options.some(option => option.key === row.credentialSelectionKey);
    if (!stillExists) {
      row.credentialSelectionKey = options[0].key;
    }
  }

  private credentialSourceAddons(row: ServiceRow): IAddon[] {
    const activeAddonNames = new Set(row.activeAddons.map(item => item.name.trim().toLowerCase()));
    if (activeAddonNames.size === 0) return row.addons;
    return row.addons.filter(addon => activeAddonNames.has(addon.addonName.trim().toLowerCase()));
  }

  private hasOpenSidePanel(): boolean {
    return this.groups().some(group => group.rows.some(row => row.sidePanelOpen));
  }

  private lockDrawerScroll(): void {
    document.body.classList.add('pservices-drawer-open');
  }

  private unlockDrawerScroll(): void {
    document.body.classList.remove('pservices-drawer-open');
  }
}
