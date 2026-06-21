import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
  imports: [CommonModule, RouterModule, PortalSidebarComponent],
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
  readonly savingMaintenance = signal(false);
  readonly userServiceId = Number(this.route.snapshot.paramMap.get('userServiceId'));

  readonly steps: GuideStep[] = [
    { step: 1, title: 'Contact client and confirm meeting', statusHint: 'Pending', detail: 'Confirm meeting date/time using the company email and phone shown on this page.' },
    { step: 2, title: 'Confirm workflow integrations', statusHint: 'In Development', detail: 'Review Trigger, Action and Output selections with the client. Confirmed items become implementation scope.' },
    { step: 3, title: 'Send payment and credential setup email', statusHint: 'In Development', detail: 'Thank the client and point them to subscriptions payment plus service credential setup.' },
    { step: 4, title: 'Credential setup reminder', statusHint: 'In Development', detail: 'Remind the client credentials are encrypted and saved directly into n8n, not stored in plain text.' },
    { step: 5, title: 'Create n8n credentials', statusHint: 'In Development', detail: 'Credentials should be created in n8n as Company | Service | Integration.' },
    { step: 6, title: 'Store credential reference', statusHint: 'In Development', detail: 'Record the n8n credential reference against the integration when available.' },
    { step: 7, title: 'Handle failed n8n test connection', statusHint: 'In Development', detail: 'Return and display n8n failure reasons so the client can correct credentials.' },
    { step: 8, title: 'Wait for credentials and Paystack payment', statusHint: 'In Development', detail: 'When all credentials and payment are complete, notify the assigned developer.' },
    { step: 9, title: 'Unlock development', statusHint: 'In Development', detail: 'Service status moves into development and build work can start.' },
    { step: 10, title: 'Build n8n workflow', statusHint: 'In Development', detail: 'Open the auto-created workflow and build from selected configuration, integrations and notes.' },
    { step: 11, title: 'Create/update n8n note node', statusHint: 'In Development', detail: 'Add selected configuration, integrations and meeting notes to the workflow note node.' },
    { step: 12, title: 'Testing', statusHint: 'In Development', detail: 'Run at least 10 realistic test runs and target 90-100% output accuracy against agreed expectations.' },
    { step: 13, title: 'Publish workflow', statusHint: 'Live', detail: 'Publish the n8n workflow after successful testing.' },
    { step: 14, title: 'Maintenance check', statusHint: 'Live', detail: 'On service review, maintenance mode should show the user the service is being updated.' },
    { step: 15, title: 'Live-state sync', statusHint: 'Live', detail: 'When not in maintenance, compare n8n live/published state and keep local status aligned.' },
    { step: 16, title: 'Mark live workflow complete', statusHint: 'Live', detail: 'Live n8n workflows should show the testing/live step completed in the dev portal.' },
    { step: 17, title: 'Maintenance mode control', statusHint: 'Live', detail: 'Use the maintenance button when updates are being made for any reason.' },
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
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Failed to load service guide.');
      },
    });
  }

  markStep(step: GuideStep): void {
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
}
