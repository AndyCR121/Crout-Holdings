import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';
import {
  ICreateDevServiceAssignment,
  IDevServiceAssignment,
  IUpdateDevServiceAssignment,
  IUser,
} from '../../../interfaces/i-service.interface';

type AssignedFilter = '' | 'true' | 'false';
type ActiveFilter = '' | 'true' | 'false';

@Component({
  selector: 'ca-admin-dev-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dev-management.component.html',
  styleUrls: ['./admin-dev-management.component.scss'],
})
export class AdminDevManagementComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmDialogService);

  devUsers = signal<IUser[]>([]);
  assignments = signal<IDevServiceAssignment[]>([]);
  unassigned = signal<IDevServiceAssignment[]>([]);
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  showCreate = signal(false);

  page = signal(1);
  pageSize = 10;
  total = signal(0);

  search = '';
  referral = '';
  developerId: number | null = null;
  assigned: AssignedFilter = '';
  active: ActiveFilter = '';

  drafts = new Map<number, IUpdateDevServiceAssignment>();

  createBuffer: ICreateDevServiceAssignment = {
    userId: 0,
    userServiceId: 0,
    commissionPerc: 20,
    cost: 0,
  };

  get totalPages(): number { return Math.ceil(this.total() / this.pageSize) || 1; }
  get hasMore(): boolean { return this.page() < this.totalPages; }

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user?.isAdmin) { this.router.navigate(['/client/dashboard']); return; }
    this.loadDevUsers();
    this.loadAssignments();
  }

  loadDevUsers(): void {
    this.admin.getDevUsers(1, 200).subscribe({
      next: result => this.devUsers.set(result.items),
      error: () => this.error.set('Failed to load Developer users.'),
    });
  }

  loadAssignments(): void {
    this.loading.set(true);
    this.error.set(null);
    this.drafts.clear();
    this.admin.getDevServices(this.page(), this.pageSize, {
      search: this.search,
      referral: this.referral,
      developerId: this.developerId ?? undefined,
      assigned: this.assigned === '' ? undefined : this.assigned === 'true',
      active: this.active === '' ? undefined : this.active === 'true',
    }).subscribe({
      next: result => {
        this.assignments.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load Developer assignments.');
        this.loading.set(false);
      },
    });
  }

  loadUnassigned(): void {
    this.admin.getDevServices(1, 200, { assigned: false }).subscribe({
      next: result => this.unassigned.set(result.items),
      error: () => this.error.set('Failed to load unassigned services.'),
    });
  }

  applyFilters(): void {
    this.page.set(1);
    this.loadAssignments();
  }

  clearFilters(): void {
    this.search = '';
    this.referral = '';
    this.developerId = null;
    this.assigned = '';
    this.active = '';
    this.applyFilters();
  }

  prevPage(): void { if (this.page() > 1) { this.page.update(p => p - 1); this.loadAssignments(); } }
  nextPage(): void { if (this.hasMore) { this.page.update(p => p + 1); this.loadAssignments(); } }

  openCreate(): void {
    this.createBuffer = { userId: this.devUsers()[0]?.userId ?? 0, userServiceId: 0, commissionPerc: 20, cost: 0 };
    this.loadUnassigned();
    this.showCreate.set(true);
  }

  openCreateFor(row: IDevServiceAssignment): void {
    this.createBuffer = {
      userId: this.devUsers()[0]?.userId ?? 0,
      userServiceId: row.userServiceId,
      commissionPerc: row.commissionPerc || 20,
      cost: row.cost || 0,
    };
    this.unassigned.set([row]);
    this.showCreate.set(true);
  }

  submitCreate(): void {
    if (!this.createBuffer.userId || !this.createBuffer.userServiceId) {
      this.error.set('Select a Developer and client service.');
      return;
    }
    this.saving.set(true);
    this.admin.createDevService(this.createBuffer).subscribe({
      next: () => {
        this.saving.set(false);
        this.showCreate.set(false);
        this.loadAssignments();
        this.loadUnassigned();
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'Failed to create Developer assignment.');
        this.saving.set(false);
      },
    });
  }

  isEditing(id?: number): boolean {
    return id != null && this.drafts.has(id);
  }

  getDraft(id?: number): IUpdateDevServiceAssignment {
    if (id == null) return { userId: 0, commissionPerc: 20, cost: 0, isActive: true };
    return this.drafts.get(id) ?? { userId: 0, commissionPerc: 20, cost: 0, isActive: true };
  }

  startEdit(row: IDevServiceAssignment): void {
    if (!row.devServiceId || !row.userId) return;
    this.drafts.set(row.devServiceId, {
      userId: row.userId,
      commissionPerc: row.commissionPerc,
      cost: row.cost,
      isActive: row.isActive,
    });
  }

  cancelEdit(id?: number): void {
    if (id != null) this.drafts.delete(id);
  }

  saveEdit(row: IDevServiceAssignment): void {
    if (!row.devServiceId) return;
    const draft = this.drafts.get(row.devServiceId);
    if (!draft) return;
    this.saving.set(true);
    this.admin.updateDevService(row.devServiceId, draft).subscribe({
      next: () => {
        this.saving.set(false);
        this.drafts.delete(row.devServiceId!);
        this.loadAssignments();
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'Failed to save Developer assignment.');
        this.saving.set(false);
      },
    });
  }

  async onDelete(row: IDevServiceAssignment): Promise<void> {
    if (!row.devServiceId) return;
    const confirmed = await this.confirm.open(
      'Delete Assignment',
      `Delete the Developer assignment for ${row.companyName} - ${row.serviceName}?`
    );
    if (!confirmed) return;
    this.saving.set(true);
    this.admin.deleteDevService(row.devServiceId).subscribe({
      next: () => {
        this.assignments.update(items => items.filter(item => item.devServiceId !== row.devServiceId));
        this.total.update(count => Math.max(0, count - 1));
        this.saving.set(false);
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'Failed to delete Developer assignment.');
        this.saving.set(false);
      },
    });
  }

  formatMoney(value: number | null | undefined): string {
    return `R${Number(value ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  statusLabel(status: number): string {
    return ['Disabled', 'In Development', 'Live', 'Pending'][status] ?? 'Unknown';
  }

  displayDate(value?: string): string {
    if (!value) return 'None';
    return new Date(value).toLocaleDateString('en-ZA');
  }
}
