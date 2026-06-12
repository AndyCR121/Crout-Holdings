import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';
import { IUser } from '../../../interfaces/i-service.interface';

@Component({
  selector: 'ca-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss'],
})
export class AdminUsersComponent implements OnInit {
  private readonly auth    = inject(AuthService);
  private readonly admin   = inject(AdminService);
  private readonly router  = inject(Router);
  private readonly confirm = inject(ConfirmDialogService);

  users    = signal<IUser[]>([]);
  loading  = signal(true);
  error    = signal<string | null>(null);
  page     = signal(1);
  pageSize = 10;
  total    = signal(0);

  // Per-row draft map — fixes the "edit applies to all rows" bug
  drafts = new Map<number, Partial<IUser>>();
  saving = signal(false);

  get totalPages(): number { return Math.ceil(this.total() / this.pageSize) || 1; }
  get hasMore(): boolean   { return this.page() < this.totalPages; }

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user?.isAdmin) { this.router.navigate(['/']); return; }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.drafts.clear();
    this.admin.getUsers(this.page(), this.pageSize).subscribe({
      next: result => {
        this.users.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: () => { this.error.set('Failed to load users.'); this.loading.set(false); }
    });
  }

  prevPage(): void { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage(): void { if (this.hasMore) { this.page.update(p => p + 1); this.load(); } }

  // ── Edit (isolated per row) ───────────────────────────────────────────────
  isEditing(id: number): boolean { return this.drafts.has(id); }

  getDraft(id: number): Partial<IUser> { return this.drafts.get(id) ?? {}; }

  startEdit(user: IUser): void {
    this.drafts.set(user.userId, {
      firstName:  user.firstName,
      surname:    user.surname,
      email:      user.email,
      cellNumber: user.cellNumber,
      isAdmin:    user.isAdmin,
      active:     user.active,
    });
  }

  cancelEdit(id: number): void { this.drafts.delete(id); }

  saveEdit(user: IUser): void {
    const draft = this.drafts.get(user.userId);
    if (!draft) return;
    this.saving.set(true);
    this.admin.updateUser(user.userId, draft).subscribe({
      next: updated => {
        this.users.update(list => list.map(u => u.userId === updated.userId ? updated : u));
        this.drafts.delete(user.userId);
        this.saving.set(false);
      },
      error: () => { this.error.set('Failed to save user.'); this.saving.set(false); }
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async onDelete(user: IUser): Promise<void> {
    const confirmed = await this.confirm.open(
      'Delete User',
      `Permanently delete "${user.firstName} ${user.surname}" (${user.username})? This cannot be undone.`
    );
    if (!confirmed) return;
    this.admin.deleteUser(user.userId).subscribe({
      next: () => {
        this.users.update(list => list.filter(u => u.userId !== user.userId));
        this.total.update(t => t - 1);
      },
      error: () => this.error.set('Failed to delete user.')
    });
  }
}
