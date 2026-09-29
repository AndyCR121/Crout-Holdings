import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CustomFormShareLinkApiService } from '../../services/custom-form-share-link-api.service';
import {
  CustomFormShareLinkGenerated,
  CustomFormShareLinkStatus,
  CustomFormShareMethod,
  SHARE_LINK_MAX_VALIDITY_DAYS,
} from '../../interfaces/i-custom-form-share-link.interface';

type ShareViewState = 'loading' | 'empty' | 'settings' | 'just-generated' | 'active' | 'not-owner' | 'error';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Owner-facing panel for generating, viewing, revoking, and regenerating a Custom Form
 * share link. Generating opens a settings step first (share method + validity) — see the
 * spec's "Generating a share link"/"Link validity" requirements. The full URL (for the
 * 'url' method) is only ever shown immediately after generate()/regenerate() — reopening
 * the panel later shows metadata only, since the token is stored hashed and cannot be
 * recovered server-side (design.md D1).
 */
@Component({
  selector: 'ca-custom-form-share-panel',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './custom-form-share-panel.component.html',
  styleUrl: './custom-form-share-panel.component.scss',
})
export class CustomFormSharePanelComponent implements OnChanges {
  private readonly shareApi = inject(CustomFormShareLinkApiService);

  @Input({ required: true }) open = false;
  @Input({ required: true }) companyId!: number;
  @Input({ required: true }) userServiceId!: number;
  @Input() serviceLabel = 'this form';
  @Output() closed = new EventEmitter<void>();

  readonly maxValidityDays = SHARE_LINK_MAX_VALIDITY_DAYS;

  readonly state = signal<ShareViewState>('loading');
  readonly status = signal<CustomFormShareLinkStatus | null>(null);
  readonly generated = signal<CustomFormShareLinkGenerated | null>(null);
  readonly busy = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly copied = signal(false);

  // Settings-step form state
  readonly shareMethod = signal<CustomFormShareMethod>('url');
  readonly validityPreset = signal<'oneYear' | 'custom'>('oneYear');
  readonly customDays = signal<number>(30);
  readonly recipients = signal<string[]>([]);
  readonly recipientDraft = signal('');
  readonly recipientError = signal<string | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.generated.set(null);
      this.copied.set(false);
      this.loadStatus();
    }
  }

  close(): void {
    this.closed.emit();
  }

  loadStatus(): void {
    this.state.set('loading');
    this.shareApi.getStatus(this.companyId, this.userServiceId).subscribe({
      next: status => {
        this.status.set(status);
        if (!status.isOwner && status.exists) {
          this.state.set('not-owner');
          return;
        }
        this.state.set(status.exists ? 'active' : 'empty');
      },
      error: err => {
        if (err?.status === 403) {
          this.state.set('not-owner');
          return;
        }
        this.state.set('error');
        this.errorMessage.set(err?.error?.error ?? 'Could not load share link status.');
      },
    });
  }

  // ── Settings step ──────────────────────────────────────────────────────

  openSettings(): void {
    this.errorMessage.set(null);
    this.shareMethod.set('url');
    this.validityPreset.set('oneYear');
    this.customDays.set(30);
    this.recipients.set([]);
    this.recipientDraft.set('');
    this.recipientError.set(null);
    this.state.set('settings');
  }

  setShareMethod(method: CustomFormShareMethod): void {
    this.shareMethod.set(method);
  }

  setValidityPreset(preset: 'oneYear' | 'custom'): void {
    this.validityPreset.set(preset);
  }

  onCustomDaysChange(value: string): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    this.customDays.set(Math.min(Math.max(Math.trunc(parsed), 1), this.maxValidityDays));
  }

  onRecipientDraftChange(value: string): void {
    this.recipientDraft.set(value);
    if (this.recipientError()) this.recipientError.set(null);
  }

  addRecipientFromDraft(): void {
    const candidate = this.recipientDraft().trim().replace(/,$/, '');
    if (!candidate) return;
    if (!EMAIL_PATTERN.test(candidate)) {
      this.recipientError.set(`"${candidate}" is not a valid email address.`);
      return;
    }
    if (this.recipients().some(e => e.toLowerCase() === candidate.toLowerCase())) {
      this.recipientDraft.set('');
      return;
    }
    this.recipients.update(list => [...list, candidate]);
    this.recipientDraft.set('');
    this.recipientError.set(null);
  }

  removeRecipient(email: string): void {
    this.recipients.update(list => list.filter(e => e !== email));
  }

  get validityDays(): number {
    return this.validityPreset() === 'oneYear' ? this.maxValidityDays : this.customDays();
  }

  get canGenerate(): boolean {
    if (this.shareMethod() === 'email' && this.recipients().length === 0) return false;
    return this.validityDays >= 1 && this.validityDays <= this.maxValidityDays;
  }

  confirmGenerate(): void {
    if (!this.canGenerate) return;
    this.busy.set(true);
    this.errorMessage.set(null);
    this.shareApi
      .generate(this.companyId, this.userServiceId, {
        shareMethod: this.shareMethod(),
        validityDays: this.validityDays,
        recipientEmails: this.shareMethod() === 'email' ? this.recipients() : undefined,
      })
      .subscribe({
        next: result => {
          this.generated.set(result);
          this.busy.set(false);
          this.state.set('just-generated');
        },
        error: err => {
          this.busy.set(false);
          this.errorMessage.set(err?.error?.error ?? 'Could not generate a share link.');
        },
      });
  }

  regenerate(): void {
    this.openSettings();
  }

  revoke(): void {
    if (!confirm('Revoke this share link? Anyone still holding the URL will immediately lose access.')) return;
    this.busy.set(true);
    this.errorMessage.set(null);
    this.shareApi.revoke(this.companyId, this.userServiceId).subscribe({
      next: () => {
        this.busy.set(false);
        this.generated.set(null);
        this.loadStatus();
      },
      error: err => {
        this.busy.set(false);
        this.errorMessage.set(err?.error?.error ?? 'Could not revoke this share link.');
      },
    });
  }

  copyUrl(): void {
    const url = this.generated()?.url;
    if (!url) return;
    navigator.clipboard?.writeText(url).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }).catch(() => { /* clipboard API unavailable — user can still select/copy manually */ });
  }
}
