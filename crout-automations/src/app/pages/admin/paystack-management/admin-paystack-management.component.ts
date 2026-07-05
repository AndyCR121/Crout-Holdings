import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';
import { IAdminPaystackMapping } from '../../../interfaces/i-service.interface';

@Component({
  selector: 'ca-admin-paystack-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-paystack-management.component.html',
  styleUrls: ['./admin-paystack-management.component.scss'],
})
export class AdminPaystackManagementComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);

  readonly items = signal<IAdminPaystackMapping[]>([]);
  readonly loading = signal(true);
  readonly saving = signal<number | null>(null);
  readonly error = signal<string | null>(null);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly pageSize = 12;
  readonly search = signal('');
  readonly mappingStatus = signal('');
  readonly editingId = signal<number | null>(null);
  readonly editSubscriptionId = signal('');
  readonly editStatus = signal(3);
  readonly editPaymentDate = signal<string | null>(null);
  readonly editDueDate = signal<string | null>(null);

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user?.isAdmin) { this.router.navigate(['/client/dashboard']); return; }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.admin.getPaystackMappings(this.page(), this.pageSize, {
      search: this.search(),
      mappingStatus: this.mappingStatus(),
    }).subscribe({
      next: result => {
        this.items.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'Failed to load Paystack mappings.');
        this.loading.set(false);
      }
    });
  }

  applyFilters(): void { this.page.set(1); this.load(); }
  prevPage(): void { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage(): void { if (this.page() * this.pageSize < this.total()) { this.page.update(p => p + 1); this.load(); } }

  startEdit(row: IAdminPaystackMapping): void {
    this.editingId.set(row.userServiceId);
    this.editSubscriptionId.set(row.subscriptionId ?? '');
    this.editStatus.set(row.status);
    this.editPaymentDate.set(row.paymentDate ? row.paymentDate.slice(0, 10) : null);
    this.editDueDate.set(row.dueDate ? row.dueDate.slice(0, 10) : null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editSubscriptionId.set('');
  }

  save(row: IAdminPaystackMapping): void {
    this.saving.set(row.userServiceId);
    this.admin.updatePaystackMapping(row.userServiceId, {
      subscriptionId: this.editSubscriptionId().trim() || null,
      status: this.editStatus(),
      paymentDate: this.editPaymentDate(),
      dueDate: this.editDueDate(),
    }).subscribe({
      next: () => {
        this.saving.set(null);
        this.cancelEdit();
        this.load();
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'Failed to update Paystack mapping.');
        this.saving.set(null);
      }
    });
  }

  clear(row: IAdminPaystackMapping): void {
    this.saving.set(row.userServiceId);
    this.admin.clearPaystackMapping(row.userServiceId).subscribe({
      next: () => {
        this.saving.set(null);
        this.load();
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'Failed to clear Paystack mapping.');
        this.saving.set(null);
      }
    });
  }

  statusLabel(status: number): string {
    return ['Disabled', 'In Development', 'Live', 'Pending'][status] ?? 'Unknown';
  }
}
