import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';
import { AdminSidebarComponent } from '../../../components/admin-sidebar/admin-sidebar.component';
import { IAdminClientService, IAdminClientServiceUpsert, ICompany, IService, UserServiceStatus } from '../../../interfaces/i-service.interface';

@Component({
  selector: 'ca-admin-client-services',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent],
  templateUrl: './admin-client-services.component.html',
  styleUrls: ['./admin-client-services.component.scss'],
})
export class AdminClientServicesComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);

  readonly items = signal<IAdminClientService[]>([]);
  readonly companies = signal<ICompany[]>([]);
  readonly services = signal<IService[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
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

  statusLabel(status: number): string {
    return ['Disabled', 'In Development', 'Live', 'Pending'][status] ?? 'Unknown';
  }

  private toDateInput(value?: string): string | null {
    return value ? value.slice(0, 10) : null;
  }
}
