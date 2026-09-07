import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { CustomFormShareLinkApiService } from '../../services/custom-form-share-link-api.service';
import { CustomFormShareLinkGenerated, CustomFormShareLinkStatus } from '../../interfaces/i-custom-form-share-link.interface';

type ShareViewState = 'loading' | 'empty' | 'just-generated' | 'active' | 'not-owner' | 'error';

/**
 * Owner-facing panel for generating, viewing, revoking, and regenerating a Custom Form
 * share link. The full URL is only ever shown immediately after generate()/regenerate()
 * — reopening the panel later shows metadata only, since the token is stored hashed and
 * cannot be recovered server-side (design.md D1).
 */
@Component({
  selector: 'ca-custom-form-share-panel',
  standalone: true,
  imports: [CommonModule],
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

  readonly state = signal<ShareViewState>('loading');
  readonly status = signal<CustomFormShareLinkStatus | null>(null);
  readonly generated = signal<CustomFormShareLinkGenerated | null>(null);
  readonly busy = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly copied = signal(false);

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

  generate(): void {
    this.busy.set(true);
    this.errorMessage.set(null);
    this.shareApi.generate(this.companyId, this.userServiceId).subscribe({
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
    this.generate();
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
