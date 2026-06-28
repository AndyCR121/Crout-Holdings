import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PortalSidebarComponent } from '../../../components/portal-sidebar/portal-sidebar.component';
import { IDevPortalService } from '../../../interfaces/i-service.interface';
import { DevService } from '../../../services/dev.service';
import { ToastService } from '../../../services/toast.service';
import { IntegrationStatusBadgeComponent } from '../../../components/integration-status-badge/integration-status-badge.component';
import { IntegrationStatusService } from '../../../services/integration-status.service';

@Component({
  selector: 'ca-dev-services',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PortalSidebarComponent, IntegrationStatusBadgeComponent],
  templateUrl: './dev-services.component.html',
  styleUrls: ['./dev-services.component.scss'],
})
export class DevServicesComponent implements OnInit {
  private readonly dev = inject(DevService);
  private readonly toast = inject(ToastService);
  private readonly integrationStatus = inject(IntegrationStatusService);

  readonly assigned = signal<IDevPortalService[]>([]);
  readonly available = signal<IDevPortalService[]>([]);
  readonly loadingAssigned = signal(true);
  readonly loadingAvailable = signal(true);
  readonly claimingId = signal<number | null>(null);
  readonly assignedTotal = signal(0);
  readonly availableTotal = signal(0);

  assignedSearch = '';
  availableSearch = '';
  assignedPage = 1;
  availablePage = 1;
  readonly pageSize = 12;

  ngOnInit(): void {
    this.loadAssigned();
    this.loadAvailable();
  }

  loadAssigned(): void {
    this.loadingAssigned.set(true);
    this.dev.getAssigned(this.assignedPage, this.pageSize, this.assignedSearch).subscribe({
      next: result => {
        this.assigned.set(result.items);
        this.assignedTotal.set(result.total);
        this.loadingAssigned.set(false);
      },
      error: () => {
        this.loadingAssigned.set(false);
        this.toast.error('Failed to load assigned services.');
      },
    });
  }

  loadAvailable(): void {
    this.loadingAvailable.set(true);
    this.dev.getAvailable(this.availablePage, this.pageSize, this.availableSearch).subscribe({
      next: result => {
        this.available.set(result.items);
        this.availableTotal.set(result.total);
        this.loadingAvailable.set(false);
      },
      error: () => {
        this.loadingAvailable.set(false);
        this.toast.error('Failed to load available services.');
      },
    });
  }

  claim(item: IDevPortalService): void {
    this.claimingId.set(item.userServiceId);
    this.dev.claim(item.userServiceId).subscribe({
      next: () => {
        this.toast.success('Service claimed.');
        this.claimingId.set(null);
        this.available.update(list => list.filter(x => x.userServiceId !== item.userServiceId));
        this.availableTotal.update(total => Math.max(0, total - 1));
        this.assigned.update(list => [{ ...item, isActive: true, commissionPerc: item.commissionPerc || 20 }, ...list]);
        this.assignedTotal.update(total => total + 1);
        this.refreshListsAfterClaim();
      },
      error: err => {
        this.claimingId.set(null);
        this.toast.error(err?.error?.error ?? 'Service could not be claimed.');
        this.loadAvailable();
      },
    });
  }

  private refreshListsAfterClaim(): void {
    this.loadingAssigned.set(true);
    this.loadingAvailable.set(true);
    forkJoin({
      assigned: this.dev.getAssigned(this.assignedPage, this.pageSize, this.assignedSearch),
      available: this.dev.getAvailable(this.availablePage, this.pageSize, this.availableSearch),
    }).subscribe({
      next: ({ assigned, available }) => {
        this.assigned.set(assigned.items);
        this.assignedTotal.set(assigned.total);
        this.available.set(available.items);
        this.availableTotal.set(available.total);
        this.loadingAssigned.set(false);
        this.loadingAvailable.set(false);
      },
      error: () => {
        this.loadingAssigned.set(false);
        this.loadingAvailable.set(false);
      },
    });
  }

  searchAssigned(): void {
    this.assignedPage = 1;
    this.loadAssigned();
  }

  searchAvailable(): void {
    this.availablePage = 1;
    this.loadAvailable();
  }

  nextAssigned(): void {
    if (this.assignedPage * this.pageSize >= this.assignedTotal()) return;
    this.assignedPage += 1;
    this.loadAssigned();
  }

  prevAssigned(): void {
    if (this.assignedPage === 1) return;
    this.assignedPage -= 1;
    this.loadAssigned();
  }

  nextAvailable(): void {
    if (this.availablePage * this.pageSize >= this.availableTotal()) return;
    this.availablePage += 1;
    this.loadAvailable();
  }

  prevAvailable(): void {
    if (this.availablePage === 1) return;
    this.availablePage -= 1;
    this.loadAvailable();
  }

  formatMoney(value: number | null | undefined): string {
    return `R${Number(value ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatDate(value?: string | null): string {
    if (!value) return 'None';
    return new Date(value).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: '2-digit' });
  }

  statusLabel(status: number): string {
    return this.integrationStatus.label(null, status);
  }

  statusClass(status: number): string {
    return this.integrationStatus.cssClass(null, status);
  }

  guideHref(userServiceId: number): string {
    return `/dev/dev-services/guide/?userServiceId=${userServiceId}`;
  }
}
