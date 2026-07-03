import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { PortalSidebarComponent } from '../../../components/portal-sidebar/portal-sidebar.component';
import { IDevPortalService } from '../../../interfaces/i-service.interface';
import { DevService } from '../../../services/dev.service';
import { ToastService } from '../../../services/toast.service';
import { IntegrationStatusBadgeComponent } from '../../../components/integration-status-badge/integration-status-badge.component';
import { IntegrationStatusService } from '../../../services/integration-status.service';

interface GuideStep {
  step: number;
  title: string;
  statusHint: string;
  detail: string;
}

interface WorkflowAddonSelection {
  addonId: number;
  name: string;
  type: 'Trigger' | 'Action' | 'Output';
  confirmed: boolean;
  isActive: boolean;
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
  private readonly toast = inject(ToastService);
  private readonly integrationStatus = inject(IntegrationStatusService);
  private redirectingToServices = false;

  readonly guide = signal<IDevPortalService | null>(null);
  readonly loading = signal(true);
  readonly savingStep = signal<number | null>(null);
  readonly savingIntegrations = signal(false);
  readonly savingMaintenance = signal(false);
  readonly integrationEditorOpen = signal(true);
  readonly userServiceId = signal<number | null>(null);
  readonly availableSelections = signal<WorkflowAddonSelection[]>([]);
  selectedAddonIds: number[] = [];

  readonly steps: GuideStep[] = [
    { step: 1, title: 'Contact client and confirm meeting', statusHint: 'Pending', detail: 'Confirm meeting date/time using the company email and phone shown on this page.' },
    { step: 2, title: 'Confirm workflow integrations', statusHint: 'Pending', detail: 'Review Trigger, Action and Output selections with the client. Confirmed items become implementation scope.' },
    { step: 3, title: 'Send payment and credential setup email', statusHint: 'Pending', detail: 'Automatic after workflow integrations are confirmed. The client is sent the subscription payment request and credential setup instructions.' },
    { step: 4, title: 'Payment and credential completion', statusHint: 'In Development', detail: 'Automatic after the linked subscription is paid and all required integration credentials are filled in.' },
    { step: 5, title: 'Workflow published and service live', statusHint: 'Live', detail: 'Automatic after the developer publishes the workflow in n8n and the dashboard check confirms the live workflow state.' },
  ];

  readonly groupedSelections = computed(() => ({
    trigger: this.availableSelections().filter(item => item.type === 'Trigger'),
    action: this.availableSelections().filter(item => item.type === 'Action'),
    output: this.availableSelections().filter(item => item.type === 'Output'),
  }));
  readonly confirmedSummary = computed(() => ({
    trigger: this.availableSelections().filter(item => item.type === 'Trigger' && item.confirmed),
    action: this.availableSelections().filter(item => item.type === 'Action' && item.confirmed),
    output: this.availableSelections().filter(item => item.type === 'Output' && item.confirmed),
  }));
  readonly canBuildCustomForm = computed(() =>
    this.confirmedSummary().trigger.some(item => this.isCustomFormTrigger(item.name)));
  readonly hasAnyCapabilityOptions = computed(() => this.availableSelections().length > 0);
  readonly hasAnyIntegrationSelection = computed(() => this.selectedAddonIds.length > 0);

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

        this.guide.set(guide);
        const selections = this.parseSelections(guide.config);
        this.availableSelections.set(selections);
        this.selectedAddonIds = selections.filter(item => item.confirmed).map(item => item.addonId);
        if (!this.selectedAddonIds.length) {
          this.selectedAddonIds = selections.filter(item => item.isActive).map(item => item.addonId);
        }
        this.loading.set(false);
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

  toggleIntegration(addonId: number): void {
    const index = this.selectedAddonIds.indexOf(addonId);
    if (index >= 0) this.selectedAddonIds.splice(index, 1);
    else this.selectedAddonIds.push(addonId);
  }

  isIntegrationSelected(addonId: number): boolean {
    return this.selectedAddonIds.includes(addonId);
  }

  saveIntegrationConfirmation(): void {
    const userServiceId = this.userServiceId();
    if (userServiceId === null) return;
    if (!this.hasAnyIntegrationSelection()) {
      this.toast.error('Select at least one workflow integration before confirming.');
      return;
    }

    const selected = this.availableSelections().filter(item => this.selectedAddonIds.includes(item.addonId));
    this.savingIntegrations.set(true);
    this.dev.updateGuideIntegrations(userServiceId, {
      trigger: selected.filter(item => item.type === 'Trigger').map(item => item.name),
      action: selected.filter(item => item.type === 'Action').map(item => item.name),
      output: selected.filter(item => item.type === 'Output').map(item => item.name),
    }).subscribe({
      next: guide => {
        this.guide.set(guide);
        const selections = this.parseSelections(guide.config);
        this.availableSelections.set(selections);
        this.selectedAddonIds = selections.filter(item => item.confirmed).map(item => item.addonId);
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

  private parseSelections(config?: string | null): WorkflowAddonSelection[] {
    if (!config?.trim()) return [];

    try {
      const parsed = JSON.parse(config) as Record<string, unknown>;
      const requested = Array.isArray(parsed['requestedAddons']) ? parsed['requestedAddons'] as Array<Record<string, unknown>> : [];
      const confirmedIds = new Set(
        (Array.isArray(parsed['confirmedAddons']) ? parsed['confirmedAddons'] as Array<Record<string, unknown>> : [])
          .map(item => Number(item['addonId']))
          .filter(id => Number.isFinite(id) && id > 0)
      );

      return requested
        .map(item => ({
          addonId: Number(item['addonId'] ?? 0),
          name: typeof item['name'] === 'string' ? item['name'].trim() : '',
          type: this.normalizeType(item['type']),
          confirmed: confirmedIds.has(Number(item['addonId'])) || item['confirmed'] === true,
          isActive: item['isActive'] !== false,
        }))
        .filter(item => item.addonId > 0 && item.name.length > 0 && item.isActive);
    } catch {
      return [];
    }
  }

  private normalizeType(value: unknown): 'Trigger' | 'Action' | 'Output' {
    const normalized = typeof value === 'string' ? value.toLowerCase() : 'action';
    if (normalized === 'trigger') return 'Trigger';
    if (normalized === 'output') return 'Output';
    return 'Action';
  }
}
