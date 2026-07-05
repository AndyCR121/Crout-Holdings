import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { IDevDashboard, IDevPortalService } from '../../../interfaces/i-service.interface';
import { AuthService } from '../../../services/auth.service';
import { DevService } from '../../../services/dev.service';
import { IntegrationStatusBadgeComponent } from '../../../components/integration-status-badge/integration-status-badge.component';
import { IntegrationStatusService } from '../../../services/integration-status.service';

@Component({
  selector: 'ca-dev-dashboard',
  standalone: true,
  imports: [CommonModule, IntegrationStatusBadgeComponent],
  templateUrl: './dev-dashboard.component.html',
  styleUrls: ['./dev-dashboard.component.scss'],
})
export class DevDashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly dev = inject(DevService);
  private readonly integrationStatus = inject(IntegrationStatusService);

  readonly user = computed(() => this.auth.currentUser());
  readonly dashboard = signal<IDevDashboard | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    this.dev.getDashboard().subscribe({
      next: data => {
        this.dashboard.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load developer dashboard.');
        this.loading.set(false);
      },
    });
  }

  recent(): IDevPortalService[] {
    return this.dashboard()?.recentAssigned ?? [];
  }

  formatMoney(value: number | null | undefined): string {
    return `R${Number(value ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  statusLabel(status: number): string {
    return this.integrationStatus.label(null, status);
  }

  statusClass(status: number): string {
    return this.integrationStatus.cssClass(null, status);
  }
}
