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
  readonly publishing = signal(false);
  readonly integrationEditorOpen = signal(true);
  readonly userServiceId = signal<number | null>(null);

  readonly baseIntegrationOptions = {
    trigger: ['Webhook', 'Email / IMAP', 'WhatsApp Message', 'Website Form', 'Scheduled Trigger'],
    action: ['Xero', 'Google Sheets', 'Trello', 'CRM Update', 'AI Agent', 'Custom Setup', 'Marketing Messaging'],
    output: ['Email Response', 'WhatsApp Reply', 'Dashboard', 'Report', 'Invoice / Quote']
  };

  editTrigger: string[] = [];
  editAction: string[] = [];
  editOutput: string[] = [];
  triggerNotes = '';
  actionNotes = '';
  outputNotes = '';

  readonly steps: GuideStep[] = [
    { step: 1, title: 'Contact client and confirm meeting', statusHint: 'Pending', detail: 'Confirm meeting date/time using the company email and phone shown on this page.' },
    { step: 2, title: 'Confirm workflow integrations', statusHint: 'Pending', detail: 'Review Trigger, Action and Output selections with the client. Confirmed items become implementation scope.' },
    { step: 3, title: 'Send payment and credential setup email', statusHint: 'Pending', detail: 'Automatic after workflow integrations are confirmed. The client is sent the subscription payment request and credential setup instructions.' },
    { step: 4, title: 'Payment and credential completion', statusHint: 'In Development', detail: 'Automatic after the linked subscription is paid and all required integration credentials are filled in.' },
    { step: 5, title: 'Workflow published and service live', statusHint: 'Live', detail: 'Automatic after the developer publishes the workflow in n8n and the dashboard check confirms the live workflow state.' },
  ];

  readonly configChips = computed(() => this.extractChips(this.guide()?.config));
  readonly pricingChips = computed(() => this.extractChips(this.guide()?.pricingSnapshot));
  readonly displayChips = computed(() => {
    const config = this.configChips();
    const pricing = this.pricingChips();
    return {
      trigger: config.trigger.length ? config.trigger : this.mergeUnique([...config.trigger, ...pricing.trigger]),
      action: config.action.length ? config.action : this.mergeUnique([...config.action, ...pricing.action]),
      output: config.output.length ? config.output : this.mergeUnique([...config.output, ...pricing.output]),
    };
  });
  readonly integrationOptions = computed(() => {
    const display = this.displayChips();
    return {
      trigger: this.mergeUnique([...this.baseIntegrationOptions.trigger, ...display.trigger]),
      action: this.mergeUnique([...this.baseIntegrationOptions.action, ...display.action]),
      output: this.mergeUnique([...this.baseIntegrationOptions.output, ...display.output]),
    };
  });

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
        this.hydrateIntegrationEditor(guide);
        this.loading.set(false);
      },
      error: () => {
        this.handleGuideLoadFailure();
      },
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

  toggleIntegration(category: 'trigger' | 'action' | 'output', name: string): void {
    const list = this.integrationList(category);
    const index = list.indexOf(name);
    if (index >= 0) list.splice(index, 1);
    else list.push(name);
  }

  isIntegrationSelected(category: 'trigger' | 'action' | 'output', name: string): boolean {
    return this.integrationList(category).includes(name);
  }

  saveIntegrationConfirmation(): void {
    const userServiceId = this.userServiceId();
    if (userServiceId === null) return;

    this.savingIntegrations.set(true);
    this.dev.updateGuideIntegrations(userServiceId, {
      trigger: this.editTrigger,
      action: this.editAction,
      output: this.editOutput,
      triggerNotes: this.triggerNotes,
      actionNotes: this.actionNotes,
      outputNotes: this.outputNotes,
    }).subscribe({
      next: guide => {
        this.guide.set(guide);
        this.hydrateIntegrationEditor(guide);
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

  publishIntegration(): void {
    const userServiceId = this.userServiceId();
    if (userServiceId === null) return;
    this.publishing.set(true);
    this.dev.publishIntegration(userServiceId).subscribe({
      next: guide => {
        this.guide.set(guide);
        this.publishing.set(false);
        this.toast.success('Integration published.');
      },
      error: err => {
        this.publishing.set(false);
        this.toast.error(err?.error?.error ?? 'Could not publish integration.');
      }
    });
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

  private extractChips(raw?: string | null): Record<'trigger' | 'action' | 'output', string[]> {
    const parsed = this.parseJson(raw);
    return {
      trigger: this.pickValues(parsed, ['trigger', 'triggers']),
      action: this.pickValues(parsed, ['action', 'actions', 'addons', 'integrations', 'services', 'selectedAddons', 'requiredComponents', 'selectedService']),
      output: this.pickValues(parsed, ['output', 'outputs', 'deliverables']),
    };
  }

  private parseJson(raw?: string | null): unknown {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private pickValues(source: unknown, keys: string[]): string[] {
    if (!source || typeof source !== 'object') return [];
    const obj = source as Record<string, unknown>;
    const values = keys.flatMap(key => this.stringifyValue(obj[key]));
    return [...new Set(values)].slice(0, 12);
  }

  private stringifyValue(value: unknown): string[] {
    if (value == null) return [];
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return [String(value)];
    if (Array.isArray(value)) return value.flatMap(item => this.stringifyValue(item));
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const label = obj['addonName'] ?? obj['serviceName'] ?? obj['componentName'] ?? obj['name'] ?? obj['title'];
      return label ? [String(label)] : [];
    }
    return [];
  }

  private integrationList(category: 'trigger' | 'action' | 'output'): string[] {
    if (category === 'trigger') return this.editTrigger;
    if (category === 'action') return this.editAction;
    return this.editOutput;
  }

  private hydrateIntegrationEditor(guide: IDevPortalService): void {
    const config = this.parseJson(guide.config);
    const pricing = this.parseJson(guide.pricingSnapshot);
    this.editTrigger = this.mergeUnique([
      ...this.pickValues(config, ['trigger', 'triggers']),
      ...this.pickIntegrationCategory(config, 'trigger'),
      ...this.pickValues(pricing, ['trigger', 'triggers'])
    ]);
    this.editAction = this.mergeUnique([
      ...this.pickValues(config, ['action', 'actions', 'addons']),
      ...this.pickIntegrationCategory(config, 'action'),
      ...this.pickValues(pricing, ['action', 'actions', 'addons', 'integrations', 'services', 'selectedAddons', 'requiredComponents', 'selectedService'])
    ]);
    this.editOutput = this.mergeUnique([
      ...this.pickValues(config, ['output', 'outputs']),
      ...this.pickIntegrationCategory(config, 'output'),
      ...this.pickValues(pricing, ['output', 'outputs', 'deliverables'])
    ]);

    const notes = config && typeof config === 'object'
      ? (config as Record<string, any>)['notes']
      : null;
    this.triggerNotes = notes?.trigger ?? '';
    this.actionNotes = notes?.action ?? '';
    this.outputNotes = notes?.output ?? '';
  }

  private pickIntegrationCategory(source: unknown, category: 'trigger' | 'action' | 'output'): string[] {
    if (!source || typeof source !== 'object') return [];
    const raw = (source as Record<string, unknown>)['integrations'];
    if (!Array.isArray(raw)) return [];
    return raw.flatMap(item => {
      if (typeof item === 'string') return category === 'action' ? [item] : [];
      if (!item || typeof item !== 'object') return [];
      const record = item as Record<string, unknown>;
      const itemCategory = record['category'];
      const name = record['name'] ?? record['label'] ?? record['addonName'];
      return itemCategory === category && name ? [String(name)] : [];
    });
  }

  private mergeUnique(values: string[]): string[] {
    return [...new Set(values.filter(v => !!v?.trim()).map(v => v.trim()))];
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
}
