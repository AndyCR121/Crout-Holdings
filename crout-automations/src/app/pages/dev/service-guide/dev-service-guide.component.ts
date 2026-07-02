import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { distinctUntilChanged, forkJoin, map } from 'rxjs';
import { PortalSidebarComponent } from '../../../components/portal-sidebar/portal-sidebar.component';
import { IDevPortalService } from '../../../interfaces/i-service.interface';
import { DevService } from '../../../services/dev.service';
import { ToastService } from '../../../services/toast.service';
import { IntegrationStatusBadgeComponent } from '../../../components/integration-status-badge/integration-status-badge.component';
import { IntegrationStatusService } from '../../../services/integration-status.service';
import { IServiceWorkflowCapability, IUserServiceWorkflowStep } from '../../../interfaces/i-workflow-capability.interface';
import { WorkflowCapabilityApiService } from '../../../services/workflow-capability-api.service';

interface GuideStep {
  step: number;
  title: string;
  statusHint: string;
  detail: string;
}

interface LegacyWorkflowSummaryItem {
  name: string;
  status: 'Confirmed' | 'Pending';
}

@Component({
  selector: 'ca-dev-service-guide',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PortalSidebarComponent, IntegrationStatusBadgeComponent],
  templateUrl: './dev-service-guide.component.html',
  styleUrls: ['./dev-service-guide.component.scss'],
})
export class DevServiceGuideComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dev = inject(DevService);
  private readonly workflowApi = inject(WorkflowCapabilityApiService);
  private readonly toast = inject(ToastService);
  private readonly integrationStatus = inject(IntegrationStatusService);
  private redirectingToServices = false;

  readonly guide = signal<IDevPortalService | null>(null);
  readonly capabilities = signal<IServiceWorkflowCapability[]>([]);
  readonly workflowSteps = signal<IUserServiceWorkflowStep[]>([]);
  readonly loading = signal(true);
  readonly savingStep = signal<number | null>(null);
  readonly savingIntegrations = signal(false);
  readonly savingMaintenance = signal(false);
  readonly integrationEditorOpen = signal(true);
  readonly userServiceId = signal<number | null>(null);
  selectedCapabilityIds: number[] = [];

  readonly steps: GuideStep[] = [
    { step: 1, title: 'Contact client and confirm meeting', statusHint: 'Pending', detail: 'Confirm meeting date/time using the company email and phone shown on this page.' },
    { step: 2, title: 'Confirm workflow integrations', statusHint: 'Pending', detail: 'Review Trigger, Action and Output selections with the client. Confirmed items become implementation scope.' },
    { step: 3, title: 'Send payment and credential setup email', statusHint: 'Pending', detail: 'Automatic after workflow integrations are confirmed. The client is sent the subscription payment request and credential setup instructions.' },
    { step: 4, title: 'Payment and credential completion', statusHint: 'In Development', detail: 'Automatic after the linked subscription is paid and all required integration credentials are filled in.' },
    { step: 5, title: 'Workflow published and service live', statusHint: 'Live', detail: 'Automatic after the developer publishes the workflow in n8n and the dashboard check confirms the live workflow state.' },
  ];

  readonly groupedCapabilities = computed(() => ({
    trigger: this.capabilities().filter(capability => capability.role === 'Trigger'),
    action: this.capabilities().filter(capability => capability.role === 'Action'),
    output: this.capabilities().filter(capability => capability.role === 'Output'),
  }));
  readonly groupedSteps = computed(() => ({
    trigger: this.workflowSteps().filter(step => step.role === 'Trigger' && step.status !== 'Disabled'),
    action: this.workflowSteps().filter(step => step.role === 'Action' && step.status !== 'Disabled'),
    output: this.workflowSteps().filter(step => step.role === 'Output' && step.status !== 'Disabled'),
  }));
  readonly groupedLegacySteps = computed(() => this.parseLegacyWorkflowSummary(this.guide()?.config));
  readonly canBuildCustomForm = computed(() =>
    this.effectiveSummary('trigger').some(step =>
      step.status === 'Confirmed' && this.isCustomFormTrigger(step.name)));
  readonly hasAnyCapabilityOptions = computed(() =>
    this.capabilities().some(capability => capability.role === 'Trigger' || capability.role === 'Action' || capability.role === 'Output'));
  readonly hasAnyIntegrationSelection = computed(() => this.selectedCapabilityIds.length > 0);

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(
        map(queryParams => this.parseUserServiceId(queryParams.get('userServiceId'))),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(userServiceId => {
        this.userServiceId.set(userServiceId);

        if (userServiceId === null) {
          this.handleGuideLoadFailure();
          return;
        }

        this.loadGuide(userServiceId);
      });
  }

  loadGuide(userServiceId = this.userServiceId()): void {
    if (userServiceId === null) {
      this.handleGuideLoadFailure();
      return;
    }

    this.loading.set(true);
    this.dev.getGuide(userServiceId).subscribe({
      next: guide => {
        if (!guide) {
          this.handleGuideLoadFailure();
          return;
        }

        forkJoin({
          capabilities: this.workflowApi.getServiceCapabilities(guide.serviceId, true),
          steps: this.workflowApi.getWorkflowSteps(userServiceId),
        }).subscribe({
          next: ({ capabilities, steps }) => {
            this.guide.set(guide);
            this.capabilities.set(capabilities);
            this.workflowSteps.set(steps);
            this.selectedCapabilityIds = this.resolveSelectedCapabilityIds(capabilities, steps, guide.config);
            this.loading.set(false);
          },
          error: () => this.handleGuideLoadFailure(),
        });
      },
      error: () => this.handleGuideLoadFailure(),
    });
  }

  markStep(step: GuideStep): void {
    const userServiceId = this.userServiceId();
    if (userServiceId === null || step.step === 3) return;
    this.savingStep.set(step.step);
    this.dev.updateGuideStep(userServiceId, step.step).subscribe({
      next: guide => {
        this.guide.set(guide);
        this.savingStep.set(null);
        this.toast.success(`Step ${step.step} marked.`);
      },
      error: err => {
        this.savingStep.set(null);
        this.toast.error(err?.error?.error ?? 'Could not update guide step.');
      },
    });
  }

  toggleIntegrationEditor(): void {
    this.integrationEditorOpen.update(open => !open);
  }

  toggleIntegration(capabilityId: number): void {
    const index = this.selectedCapabilityIds.indexOf(capabilityId);
    if (index >= 0) this.selectedCapabilityIds.splice(index, 1);
    else this.selectedCapabilityIds.push(capabilityId);
  }

  isIntegrationSelected(capabilityId: number): boolean {
    return this.selectedCapabilityIds.includes(capabilityId);
  }

  saveIntegrationConfirmation(): void {
    const userServiceId = this.userServiceId();
    if (userServiceId === null) return;
    if (!this.hasAnyIntegrationSelection()) {
      this.toast.error('Select at least one workflow integration before confirming.');
      return;
    }

    this.savingIntegrations.set(true);
    this.workflowApi.confirmSelection(userServiceId, this.selectedCapabilityIds).subscribe({
      next: steps => {
        this.workflowSteps.set(steps);
        this.savingIntegrations.set(false);
        this.integrationEditorOpen.set(false);
        this.toast.success('Workflow integrations confirmed.');
      },
      error: err => {
        this.savingIntegrations.set(false);
        this.toast.error(err?.error?.error ?? 'Could not confirm workflow integrations.');
      }
    });
  }

  toggleMaintenance(): void {
    const userServiceId = this.userServiceId();
    const current = this.guide();
    if (userServiceId === null || !current) return;
    this.savingMaintenance.set(true);
    this.dev.updateMaintenance(userServiceId, !current.isMaintenance).subscribe({
      next: guide => {
        this.guide.set(guide);
        this.savingMaintenance.set(false);
        this.toast.success(guide.isMaintenance ? 'Maintenance mode enabled.' : 'Maintenance mode disabled.');
      },
      error: err => {
        this.savingMaintenance.set(false);
        this.toast.error(err?.error?.error ?? 'Could not update maintenance mode.');
      },
    });
  }

  isComplete(step: GuideStep): boolean {
    return (this.guide()?.guideStep ?? 0) >= step.step;
  }

  isAutomaticStep(step: GuideStep): boolean {
    return step.step === 3 || step.step === 4 || step.step === 5;
  }

  automaticStepNote(step: GuideStep): string {
    if (step.step === 4) return 'Ticks automatically once payment is confirmed and required credentials are completed.';
    if (step.step === 5) return 'Ticks automatically after the n8n published-workflow check passes, then completes the SOP and notifies the client that the service is live.';
    return 'Runs automatically after Confirm Integrations.';
  }

  formatDate(value?: string | null): string {
    if (!value) return 'None';
    return new Date(value).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: '2-digit' });
  }

  statusLabel(status?: number): string {
    if (this.guide()?.isMaintenance) return 'Undergoing Maintenance';
    return this.integrationStatus.label(this.guide()?.integrationStatus, status ?? 0);
  }

  statusClass(status?: number): string {
    return this.integrationStatus.cssClass(this.guide()?.integrationStatus, status ?? 0);
  }

  formBuilderHref(): string | null {
    const userServiceId = this.userServiceId();
    return userServiceId ? `/dev/dev-services/guide/form-builder/?userServiceId=${userServiceId}` : null;
  }

  formatCapabilityMeta(capability: IServiceWorkflowCapability): string {
    return `${capability.role} · R${capability.price.toFixed(2)}`;
  }

  effectiveSummary(role: 'trigger' | 'action' | 'output'): Array<{ name: string; status: string }> {
    const canonical = this.groupedSteps()[role];
    if (canonical.length) {
      return canonical.map(step => ({ name: step.capabilityName, status: step.status }));
    }

    return this.groupedLegacySteps()[role].map(step => ({ name: step.name, status: step.status }));
  }

  private parseUserServiceId(value: string | null): number | null {
    if (!value?.trim()) return null;
    if (!/^\d+$/.test(value)) return null;

    const userServiceId = Number(value);
    return Number.isSafeInteger(userServiceId) && userServiceId > 0 ? userServiceId : null;
  }

  private handleGuideLoadFailure(): void {
    this.guide.set(null);
    this.loading.set(false);

    if (this.redirectingToServices) return;

    this.redirectingToServices = true;
    this.toast.error('Unable to load the selected guide. Please select a service again.');
    void this.router.navigate(['/dev/dev-services'], { replaceUrl: true });
  }

  private isCustomFormTrigger(name: string): boolean {
    const normalized = name.toLowerCase().replace(/[\s_-]+/g, '');
    return normalized === 'websiteform' || normalized === 'customform';
  }

  private resolveSelectedCapabilityIds(
    capabilities: IServiceWorkflowCapability[],
    steps: IUserServiceWorkflowStep[],
    config?: string,
  ): number[] {
    const canonicalIds = steps
      .filter(step => step.status === 'Pending' || step.status === 'Confirmed')
      .map(step => step.serviceWorkflowCapabilityId);
    if (canonicalIds.length) return canonicalIds;

    const legacy = this.parseLegacyWorkflowSummary(config);
    const selectedNames = new Set(
      [...legacy.trigger, ...legacy.action, ...legacy.output].map(item => item.name.toLowerCase())
    );

    return capabilities
      .filter(capability => selectedNames.has(capability.name.toLowerCase()))
      .map(capability => capability.id);
  }

  private parseLegacyWorkflowSummary(config?: string | null): Record<'trigger' | 'action' | 'output', LegacyWorkflowSummaryItem[]> {
    const empty = { trigger: [] as LegacyWorkflowSummaryItem[], action: [] as LegacyWorkflowSummaryItem[], output: [] as LegacyWorkflowSummaryItem[] };
    if (!config?.trim()) return empty;

    try {
      const parsed = JSON.parse(config) as Record<string, unknown>;
      const integrations = Array.isArray(parsed['integrations']) ? parsed['integrations'] as Array<Record<string, unknown>> : [];
      if (integrations.length) {
        for (const entry of integrations) {
          const name = typeof entry['name'] === 'string' ? entry['name'].trim() : '';
          const category = typeof entry['category'] === 'string' ? entry['category'].toLowerCase() : '';
          if (!name || (category !== 'trigger' && category !== 'action' && category !== 'output')) continue;
          empty[category].push({
            name,
            status: entry['confirmed'] === true ? 'Confirmed' : 'Pending'
          });
        }
        return empty;
      }

      for (const category of ['trigger', 'action', 'output'] as const) {
        const values = Array.isArray(parsed[category]) ? parsed[category] : [];
        empty[category] = values
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .map(name => ({ name: name.trim(), status: 'Confirmed' }));
      }
      return empty;
    } catch {
      return empty;
    }
  }
}
