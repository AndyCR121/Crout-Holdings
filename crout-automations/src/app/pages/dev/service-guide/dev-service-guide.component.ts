import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PortalSidebarComponent } from '../../../components/portal-sidebar/portal-sidebar.component';
import { IDevPortalService } from '../../../interfaces/i-service.interface';
import { DevService } from '../../../services/dev.service';
import { ToastService } from '../../../services/toast.service';

interface GuideStep {
  step: number;
  title: string;
  statusHint: string;
  detail: string;
}

@Component({
  selector: 'ca-dev-service-guide',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PortalSidebarComponent],
  templateUrl: './dev-service-guide.component.html',
  styleUrls: ['./dev-service-guide.component.scss'],
})
export class DevServiceGuideComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly dev = inject(DevService);
  private readonly toast = inject(ToastService);

  readonly guide = signal<IDevPortalService | null>(null);
  readonly loading = signal(true);
  readonly savingStep = signal<number | null>(null);
  readonly savingIntegrations = signal(false);
  readonly savingMaintenance = signal(false);
  readonly integrationEditorOpen = signal(true);
  readonly userServiceId = Number(this.route.snapshot.paramMap.get('userServiceId'));

  readonly integrationOptions = {
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

  ngOnInit(): void {
    this.loadGuide();
  }

  loadGuide(): void {
    this.loading.set(true);
    this.dev.getGuide(this.userServiceId).subscribe({
      next: guide => {
        this.guide.set(guide);
        this.hydrateIntegrationEditor(guide);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Failed to load service guide.');
      },
    });
  }

  markStep(step: GuideStep): void {
    if (step.step === 3) return;
    this.savingStep.set(step.step);
    this.dev.updateGuideStep(this.userServiceId, step.step).subscribe({
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
    this.savingIntegrations.set(true);
    this.dev.updateGuideIntegrations(this.userServiceId, {
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
    const current = this.guide();
    if (!current) return;
    this.savingMaintenance.set(true);
    this.dev.updateMaintenance(this.userServiceId, !current.isMaintenance).subscribe({
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
    return ['Disabled', 'In Development', 'Live', 'Pending'][status ?? 0] ?? 'Unknown';
  }

  statusClass(status?: number): string {
    return ['status-disabled', 'status-dev', 'status-live', 'status-pending'][status ?? 0] ?? '';
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
    this.editTrigger = this.mergeUnique([
      ...this.pickValues(config, ['trigger', 'triggers']),
      ...this.pickIntegrationCategory(config, 'trigger')
    ]);
    this.editAction = this.mergeUnique([
      ...this.pickValues(config, ['action', 'actions', 'addons']),
      ...this.pickIntegrationCategory(config, 'action')
    ]);
    this.editOutput = this.mergeUnique([
      ...this.pickValues(config, ['output', 'outputs']),
      ...this.pickIntegrationCategory(config, 'output')
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
}
