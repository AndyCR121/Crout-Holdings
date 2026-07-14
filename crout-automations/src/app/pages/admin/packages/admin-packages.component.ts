import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AdminService, PagedResult } from '../../../services/admin.service';
import { IPackage, IService } from '../../../interfaces/i-service.interface';

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
  services = signal<IService[]>([]);
  loading  = signal(true);
  error    = signal<string | null>(null);
  page     = signal(1);
  pageSize = 10;
  total    = signal(0);
  hasMore  = signal(true);

  editingId       = signal<number | null>(null);
  editBuffer      = signal<Partial<IPackage>>({});
  saving          = signal(false);
  deleteConfirmId = signal<number | null>(null);
  showCreate      = signal(false);
  createBuffer    = signal<Partial<IPackage>>({ packageName: '', packageDescription: '', discount: 0, serviceIds: [] });

  showLinkModal = signal(false);
  linkTarget    = signal<IPackage | null>(null);
  linkSelected  = signal<Set<number>>(new Set());
  linkSaving    = signal(false);

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user?.isAdmin) { this.router.navigate(['/client/dashboard']); return; }
    this.loadServices();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.admin.getPackages(this.page(), this.pageSize).subscribe({
      next: (data: PagedResult<IPackage>) => {
        this.items.set(data.items);
        this.total.set(data.total);
        this.hasMore.set(data.items.length === this.pageSize);
        this.loading.set(false);
      },
      error: () => { this.error.set('Failed to load packages.'); this.loading.set(false); }
    });
  }

  loadServices(): void {
    this.admin.getServices(1, 100).subscribe({ next: (data: IService[]) => this.services.set(data) });
  }

  prevPage(): void { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage(): void { if (this.hasMore()) { this.page.update(p => p + 1); this.load(); } }

  startEdit(p: IPackage): void {
    this.editingId.set(p.packageId);
    this.editBuffer.set({ packageId: p.packageId, packageName: p.packageName, packageDescription: p.packageDescription, discount: p.discount, minimumRequiredAddons: p.minimumRequiredAddons });
  }
  cancelEdit(): void { this.editingId.set(null); }

  saveEdit(p: IPackage): void {
    this.saving.set(true);
    this.admin.updatePackage(p.packageId, this.editBuffer()).subscribe({
      next: (updated: IPackage) => { this.items.update(list => list.map(i => i.packageId === updated.packageId ? updated : i)); this.editingId.set(null); this.saving.set(false); },
      error: () => { this.error.set('Failed to save.'); this.saving.set(false); }
    });
  }

  confirmDelete(id: number): void { this.deleteConfirmId.set(id); }
  cancelDelete(): void { this.deleteConfirmId.set(null); }
  doDelete(id: number): void {
    this.admin.deletePackage(id).subscribe({
      next: () => { this.items.update(list => list.filter(i => i.packageId !== id)); this.deleteConfirmId.set(null); },
      error: () => { this.error.set('Failed to delete.'); this.deleteConfirmId.set(null); }
    });
  }

  toggleActive(packageItem: IPackage): void {
    this.admin.togglePackageActive(packageItem.packageId).subscribe({
      next: ({ active }) => this.items.update(list => list.map(item => item.packageId === packageItem.packageId ? { ...item, active } : item)),
      error: () => this.error.set('Failed to update package availability.')
    });
  }

  submitCreate(): void {
    this.saving.set(true);
    this.admin.createPackage(this.createBuffer()).subscribe({
      next: (created: IPackage) => { this.items.update(list => [created, ...list]); this.showCreate.set(false); this.saving.set(false); this.createBuffer.set({ packageName: '', packageDescription: '', discount: 0, serviceIds: [] }); },
      error: () => { this.error.set('Failed to create.'); this.saving.set(false); }
    });
  }

  openLink(p: IPackage): void {
    this.linkTarget.set(p);
    this.admin.getPackage(p.packageId).subscribe((full: IPackage) => {
      this.linkSelected.set(new Set(full.serviceIds ?? []));
    });
    this.showLinkModal.set(true);
  }

  toggleLinkService(id: number): void {
    const s = new Set(this.linkSelected());
    s.has(id) ? s.delete(id) : s.add(id);
    this.linkSelected.set(s);
  }

  isLinkSelected(id: number): boolean { return this.linkSelected().has(id); }

  saveLinks(): void {
    const pkg = this.linkTarget();
    if (!pkg) return;
    this.linkSaving.set(true);
    this.admin.linkServicesToPackage(pkg.packageId, [...this.linkSelected()]).subscribe({
      next: () => { this.linkSaving.set(false); this.showLinkModal.set(false); this.load(); },
      error: () => { this.error.set('Failed to save links.'); this.linkSaving.set(false); }
    });
  }

  getServiceName(id: number): string {
    return this.services().find(s => s.serviceId === id)?.serviceName ?? `Service #${id}`;
  }
}
