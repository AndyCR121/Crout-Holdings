import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';
import { IAdminClientService, IAdminClientServiceUpsert, ICompany, IService, UserServiceStatus } from '../../../interfaces/i-service.interface';
import { IntegrationStatusBadgeComponent } from '../../../components/integration-status-badge/integration-status-badge.component';
import { IntegrationStatusService } from '../../../services/integration-status.service';

@Component({
  selector: 'ca-admin-client-services',
  standalone: true,
  imports: [CommonModule, FormsModule, IntegrationStatusBadgeComponent],
  templateUrl: './admin-client-services.component.html',
  styleUrls: ['./admin-client-services.component.scss'],
})
export class AdminClientServicesComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);
  private readonly integrationStatus = inject(IntegrationStatusService);

  readonly items = signal<IAdminClientService[]>([]);
  readonly companies = signal<ICompany[]>([]);
  readonly services = signal<IService[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly lifecycleLoadingId = signal<number | null>(null);
  readonly lifecycleAction = signal<'pause' | 'start' | null>(null);
  readonly error = signal<string | null>(null);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly pageSize = 10;

  readonly search = signal('');
  readonly activeFilter = signal<string>('');
  readonly editingId = signal<number | null>(null);
  readonly showCreate = signal(false);

  readonly editBuffer = signal<Partial<IAdminClientServiceUpsert>>({});
  readonly createBuffer = signal<IAdminClientServiceUpsert>({
    companyId: 0,
    serviceId: 0,
    packageId: null,
    config: '{}',
    active: true,
    status: 3,
    subscriptionAmount: 0,
    subscriptionId: null,
    paymentDate: null,
    dueDate: null,
  });

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user?.isAdmin) { this.router.navigate(['/client/dashboard']); return; }
    this.loadLookups();
    this.load();
  }

  loadLookups(): void {
    this.admin.getCompanies(1, 200).subscribe(result => {
      this.companies.set(result.items);
      const first = result.items[0];
      if (first && this.createBuffer().companyId === 0) {
        this.createBuffer.update(v => ({ ...v, companyId: first.companyId }));
      }
    });
    this.admin.getServices(1, 200).subscribe(items => {
      this.services.set(items);
      const first = items[0];
      if (first && this.createBuffer().serviceId === 0) {
        this.createBuffer.update(v => ({ ...v, serviceId: first.serviceId, subscriptionAmount: first.price ?? 0 }));
      }
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const active = this.activeFilter() === '' ? undefined : this.activeFilter() === 'true';
    this.admin.getClientServices(this.page(), this.pageSize, { search: this.search(), active }).subscribe({
      next: result => {
        this.items.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'Failed to load client services.');
        this.loading.set(false);
      }
    });
  }

  applyFilters(): void { this.page.set(1); this.load(); }
  prevPage(): void { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage(): void { if (this.page() * this.pageSize < this.total()) { this.page.update(p => p + 1); this.load(); } }

  startEdit(row: IAdminClientService): void {
    this.editingId.set(row.userServiceId);
    this.editBuffer.set({
      packageId: row.packageId ?? null,
      config: row.config || '{}',
      active: row.active,
      status: row.status,
      subscriptionAmount: row.subscriptionAmount,
      subscriptionId: row.subscriptionId ?? null,
      paymentDate: this.toDateInput(row.paymentDate),
      dueDate: this.toDateInput(row.dueDate),
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editBuffer.set({});
  }

  saveEdit(row: IAdminClientService): void {
    this.saving.set(true);
    this.admin.updateClientService(row.userServiceId, this.editBuffer()).subscribe({
      next: updated => {
        this.items.update(items => items.map(item => item.userServiceId === updated.userServiceId ? updated : item));
        this.cancelEdit();
        this.saving.set(false);
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'Failed to update client service.');
        this.saving.set(false);
      }
    });
  }

  create(): void {
    this.saving.set(true);
    this.admin.createClientService(this.createBuffer()).subscribe({
      next: created => {
        this.items.update(items => [created, ...items]);
        this.showCreate.set(false);
        this.saving.set(false);
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'Failed to add client service.');
        this.saving.set(false);
      }
    });
  }

  deactivate(row: IAdminClientService): void {
    this.admin.deleteClientService(row.userServiceId).subscribe({
      next: () => this.items.update(items => items.map(item =>
        item.userServiceId === row.userServiceId ? { ...item, active: false, status: 0 as UserServiceStatus } : item
      )),
      error: err => this.error.set(err?.error?.error ?? 'Failed to deactivate client service.')
    });
  }

  canPause(row: IAdminClientService): boolean {
    return row.integrationStatus === 'Live';
  }

  canStart(row: IAdminClientService): boolean {
    return row.integrationStatus === 'Paused' || row.integrationStatus === 'Failed' || row.integrationStatus === 'Development';
  }

  pause(row: IAdminClientService): void {
    this.lifecycleLoadingId.set(row.userServiceId);
    this.lifecycleAction.set('pause');
    this.admin.pauseClientServiceIntegration(row.userServiceId).subscribe({
      next: updated => {
        this.items.update(items => items.map(item => item.userServiceId === updated.userServiceId ? updated : item));
        this.lifecycleLoadingId.set(null);
        this.lifecycleAction.set(null);
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'Failed to pause integration.');
        this.lifecycleLoadingId.set(null);
        this.lifecycleAction.set(null);
      }
    });
  }

  start(row: IAdminClientService): void {
    this.lifecycleLoadingId.set(row.userServiceId);
    this.lifecycleAction.set('start');
    this.admin.startClientServiceIntegration(row.userServiceId).subscribe({
      next: updated => {
        this.items.update(items => items.map(item => item.userServiceId === updated.userServiceId ? updated : item));
        this.lifecycleLoadingId.set(null);
        this.lifecycleAction.set(null);
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'Failed to start integration.');
        this.lifecycleLoadingId.set(null);
        this.lifecycleAction.set(null);
      }
    });
  }

  statusLabel(status: number): string {
    return this.integrationStatus.label(null, status);
  }

  private toDateInput(value?: string): string | null {
    return value ? value.slice(0, 10) : null;
  }
}
