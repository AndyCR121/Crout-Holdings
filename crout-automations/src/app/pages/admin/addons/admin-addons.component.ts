import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';
import { IAddon, IService } from '../../../interfaces/i-service.interface';

@Component({
  selector: 'ca-admin-addons',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-addons.component.html',
  styleUrls: ['./admin-addons.component.scss'],
})
export class AdminAddonsComponent implements OnInit {
  private readonly auth   = inject(AuthService);
  private readonly admin  = inject(AdminService);
  private readonly router = inject(Router);

  items    = signal<IAddon[]>([]);
  services = signal<IService[]>([]);
  total    = signal(0);
  loading  = signal(true);
  error    = signal<string | null>(null);
  page     = signal(1);
  pageSize = 10;
  hasMore  = signal(true);
  search   = signal('');

  editingId       = signal<number | null>(null);
  editBuffer      = signal<Partial<IAddon>>({});
  saving          = signal(false);
  deleteConfirmId = signal<number | null>(null);
  showCreate      = signal(false);
  createBuffer    = signal<Partial<IAddon>>({ addonName: '', addonDescription: '', price: 0, serviceId: null });

  showLinkModal = signal(false);
  linkTarget    = signal<IAddon | null>(null);

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user || !user.isAdmin) { this.router.navigate(['/']); return; }
    this.loadServices();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.admin.getAddons(this.page(), this.pageSize, this.search()).subscribe({
      next: data => { this.items.set(data.items); this.total.set(data.total); this.hasMore.set(data.items.length === this.pageSize); this.loading.set(false); },
      error: () => { this.error.set('Failed to load addons.'); this.loading.set(false); }
    });
  }

  loadServices(): void {
    this.admin.getServices(1, 100).subscribe({ next: data => this.services.set(data) });
  }

  onSearch(): void { this.page.set(1); this.load(); }
  prevPage(): void { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage(): void { if (this.hasMore()) { this.page.update(p => p + 1); this.load(); } }

  startEdit(a: IAddon): void {
    this.editingId.set(a.addonId);
    this.editBuffer.set({ addonName: a.addonName, addonDescription: a.addonDescription, price: a.price, serviceId: a.serviceId });
  }
  cancelEdit(): void { this.editingId.set(null); }

  saveEdit(a: IAddon): void {
    this.saving.set(true);
    this.admin.updateAddon(a.addonId, this.editBuffer()).subscribe({
      next: updated => { this.items.update(list => list.map(i => i.addonId === updated.addonId ? updated : i)); this.editingId.set(null); this.saving.set(false); },
      error: () => { this.error.set('Failed to save.'); this.saving.set(false); }
    });
  }

  confirmDelete(id: number): void { this.deleteConfirmId.set(id); }
  cancelDelete(): void { this.deleteConfirmId.set(null); }
  doDelete(id: number): void {
    this.admin.deleteAddon(id).subscribe({
      next: () => { this.items.update(list => list.filter(i => i.addonId !== id)); this.deleteConfirmId.set(null); },
      error: () => { this.error.set('Failed to delete.'); this.deleteConfirmId.set(null); }
    });
  }

  submitCreate(): void {
    this.saving.set(true);
    this.admin.createAddon(this.createBuffer()).subscribe({
      next: created => { this.items.update(list => [created, ...list]); this.showCreate.set(false); this.saving.set(false); this.createBuffer.set({ addonName: '', addonDescription: '', price: 0, serviceId: null }); },
      error: () => { this.error.set('Failed to create.'); this.saving.set(false); }
    });
  }

  openLink(a: IAddon): void {
    this.linkTarget.set(a);
    this.showLinkModal.set(true);
  }

  getServiceName(id: number | null): string {
    if (!id) return '—';
    return this.services().find(s => s.serviceId === id)?.serviceName ?? `Service #${id}`;
  }
}
