import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';
import { IPackage } from '../../../interfaces/i-service.interface';

@Component({
  selector: 'ca-admin-packages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-packages.component.html',
  styleUrls: ['./admin-packages.component.scss'],
})
export class AdminPackagesComponent implements OnInit {
  private readonly auth   = inject(AuthService);
  private readonly admin  = inject(AdminService);
  private readonly router = inject(Router);

  items    = signal<IPackage[]>([]);
  loading  = signal(true);
  error    = signal<string | null>(null);
  page     = signal(1);
  pageSize = 10;
  hasMore  = signal(true);

  editingId       = signal<number | null>(null);
  editBuffer      = signal<Partial<IPackage>>({});
  saving          = signal(false);
  deleteConfirmId = signal<number | null>(null);
  showCreate      = signal(false);
  createBuffer    = signal<Partial<IPackage>>({ packageName: '', packageDescription: '', discount: 0 });

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user || !user.isAdmin) { this.router.navigate(['/']); return; }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.admin.getPackages(this.page(), this.pageSize).subscribe({
      next: data => { this.items.set(data); this.hasMore.set(data.length === this.pageSize); this.loading.set(false); },
      error: () => { this.error.set('Failed to load packages.'); this.loading.set(false); }
    });
  }

  prevPage(): void { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage(): void { if (this.hasMore()) { this.page.update(p => p + 1); this.load(); } }

  startEdit(p: IPackage): void {
    this.editingId.set(p.package_id);
    this.editBuffer.set({ packageName: p.packageName, packageDescription: p.packageDescription, discount: p.discount, minimumRequiredAddons: p.minimumRequiredAddons });
  }
  cancelEdit(): void { this.editingId.set(null); }

  saveEdit(p: IPackage): void {
    this.saving.set(true);
    this.admin.updatePackage(p.package_id, this.editBuffer()).subscribe({
      next: updated => { this.items.update(list => list.map(i => i.package_id === updated.package_id ? updated : i)); this.editingId.set(null); this.saving.set(false); },
      error: () => { this.error.set('Failed to save.'); this.saving.set(false); }
    });
  }

  confirmDelete(id: number): void { this.deleteConfirmId.set(id); }
  cancelDelete(): void { this.deleteConfirmId.set(null); }
  doDelete(id: number): void {
    this.admin.deletePackage(id).subscribe({
      next: () => { this.items.update(list => list.filter(i => i.package_id !== id)); this.deleteConfirmId.set(null); },
      error: () => { this.error.set('Failed to delete.'); this.deleteConfirmId.set(null); }
    });
  }

  submitCreate(): void {
    this.saving.set(true);
    this.admin.createPackage(this.createBuffer()).subscribe({
      next: created => { this.items.update(list => [created, ...list]); this.showCreate.set(false); this.saving.set(false); this.createBuffer.set({ packageName: '', packageDescription: '', discount: 0 }); },
      error: () => { this.error.set('Failed to create.'); this.saving.set(false); }
    });
  }
}
