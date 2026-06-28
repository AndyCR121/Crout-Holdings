import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { IntegrationLifecycleStatus, UserServiceStatus } from '../../interfaces/i-service.interface';
import { IntegrationStatusService } from '../../services/integration-status.service';

@Component({
  selector: 'ca-integration-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `<span class="integration-badge" [ngClass]="cssClass()">{{ label() }}</span>`,
  styles: [`
    .integration-badge { display:inline-flex; align-items:center; padding:.2rem .55rem; border-radius:999px; font-size:.78rem; font-weight:600; }
    .status-disabled { background:#f1f5f9; color:#475569; }
    .status-pending { background:#fef3c7; color:#92400e; }
    .status-dev { background:#dbeafe; color:#1d4ed8; }
    .status-live { background:#dcfce7; color:#166534; }
    .status-paused { background:#fde68a; color:#854d0e; }
    .status-failed { background:#fee2e2; color:#b91c1c; }
  `]
})
export class IntegrationStatusBadgeComponent {
  private readonly status = inject(IntegrationStatusService);

  readonly integrationStatus = input<IntegrationLifecycleStatus | null | undefined>(null);
  readonly legacyStatus = input<UserServiceStatus | number | null | undefined>(null);

  readonly label = computed(() => this.status.label(this.integrationStatus(), this.legacyStatus()));
  readonly cssClass = computed(() => this.status.cssClass(this.integrationStatus(), this.legacyStatus()));
}
