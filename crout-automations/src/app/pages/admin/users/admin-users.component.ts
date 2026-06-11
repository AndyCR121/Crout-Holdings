import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';
import { IUser } from '../../../interfaces/i-service.interface';

@Component({
  selector: 'ca-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss'],
})
export class AdminUsersComponent implements OnInit {
  private readonly auth   = inject(AuthService);
  private readonly admin  = inject(AdminService);
  private readonly router = inject(Router);

  users      = signal<IUser[]>([]);
  loading    = signal(true);
  error      = signal<string | null>(null);
  page       = signal(1);
  pageSize   = 10;
  hasMore    = signal(true);

  editingId  = signal<number | null>(null);
  editBuffer = signal<Partial<IUser>>({});
  saving     = signal(false);
  deleteConfirmId = signal<number | null>(null);

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user || !user.isAdmin) { this.router.navigate(['/']); return; }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.admin.getUsers(this.page(), this.pageSize).subscribe({
      next: data => {
        this.users.set(data);
        this.hasMore.set(data.length === this.pageSize);
        this.loading.set(false);
      },
      error: () => { this.error.set('Failed to load users.'); this.loading.set(false); }
    });
  }

  prevPage(): void { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage(): void { if (this.hasMore()) { this.page.update(p => p + 1); this.load(); } }

  startEdit(user: IUser): void {
    this.editingId.set(user.user_id);
    this.editBuffer.set({ firstName: user.firstName, surname: user.surname, email: user.email, cellNumber: user.cellNumber, isAdmin: user.isAdmin, active: user.active });
  }
  cancelEdit(): void { this.editingId.set(null); }

  saveEdit(user: IUser): void {
    this.saving.set(true);
    this.admin.updateUser(user.user_id, this.editBuffer()).subscribe({
      next: updated => {
        this.users.update(list => list.map(u => u.user_id === updated.user_id ? updated : u));
        this.editingId.set(null);
        this.saving.set(false);
      },
      error: () => { this.error.set('Failed to save user.'); this.saving.set(false); }
    });
  }

  confirmDelete(id: number): void { this.deleteConfirmId.set(id); }
  cancelDelete(): void { this.deleteConfirmId.set(null); }

  doDelete(id: number): void {
    this.admin.deleteUser(id).subscribe({
      next: () => { this.users.update(list => list.filter(u => u.user_id !== id)); this.deleteConfirmId.set(null); },
      error: () => { this.error.set('Failed to delete user.'); this.deleteConfirmId.set(null); }
    });
  }
}
