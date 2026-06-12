import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';
import { IServiceFeature, IService } from '../../../interfaces/i-service.interface';

@Component({
  selector: 'ca-admin-service-features',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-service-features.component.html',
  styleUrls: ['./admin-service-features.component.scss'],
})
export class AdminServiceFeaturesComponent implements OnInit {
  private readonly auth   = inject(AuthService);
  private readonly admin  = inject(AdminService);
  private readonly router = inject(Router);

  items    = signal<IServiceFeature[]>([]);
  services = signal<IService[]>([]);
  total    = signal(0);
  loading  = signal(true);
  error    = signal<string | null>(null);
  page     = signal(1);
  pageSize = 10;
  hasMore  = signal(true);
  filterServiceId = signal<number | undefined>(undefined);

  editingId       = signal<number | null>(null);
  editBuffer      = signal<Partial<IServiceFeature>>({});
  saving          = signal(false);
  deleteConfirmId = signal<number | null>(null);
  showCreate      = signal(false);
  createBuffer    = signal<Partial<IServiceFeature>>({ feature: '', sortOrder: 0, serviceId: undefined });

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user || !user.isAdmin) { this.router.navigate(['/']); return; }
    this.loadServices();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.admin.getServiceFeatures(this.page(), this.pageSize, this.filterServiceId()).subscribe({
      next: data => { this.items.set(data.items); this.total.set(data.total); this.hasMore.set(data.items.length === this.pageSize); this.loading.set(false); },
      error: () => { this.error.set('Failed to load features.'); this.loading.set(false); }
    });
  }

  loadServices(): void {
    this.admin.getServices(1, 100).subscribe({ next: data => this.services.set(data) });
  }

  onFilter(): void { this.page.set(1); this.load(); }
  prevPage(): void { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage(): void { if (this.hasMore()) { this.page.update(p => p + 1); this.load(); } }

  startEdit(f: IServiceFeature): void {
    this.editingId.set(f.featureId);
    this.editBuffer.set({ feature: f.feature, sortOrder: f.sortOrder, serviceId: f.serviceId });
  }
  cancelEdit(): void { this.editingId.set(null); }

  saveEdit(f: IServiceFeature): void {
    this.saving.set(true);
    this.admin.updateServiceFeature(f.featureId, this.editBuffer()).subscribe({
      next: updated => { this.items.update(list => list.map(i => i.featureId === updated.featureId ? updated : i)); this.editingId.set(null); this.saving.set(false); },
      error: () => { this.error.set('Failed to save.'); this.saving.set(false); }
    });
  }

  confirmDelete(id: number): void { this.deleteConfirmId.set(id); }
  cancelDelete(): void { this.deleteConfirmId.set(null); }
  doDelete(id: number): void {
    this.admin.deleteServiceFeature(id).subscribe({
      next: () => { this.items.update(list => list.filter(i => i.featureId !== id)); this.deleteConfirmId.set(null); },
      error: () => { this.error.set('Failed to delete.'); this.deleteConfirmId.set(null); }
    });
  }

  submitCreate(): void {
    this.saving.set(true);
    this.admin.createServiceFeature(this.createBuffer()).subscribe({
      next: created => { this.items.update(list => [created, ...list]); this.showCreate.set(false); this.saving.set(false); this.createBuffer.set({ feature: '', sortOrder: 0, serviceId: undefined }); },
      error: () => { this.error.set('Failed to create.'); this.saving.set(false); }
    });
  }

  getServiceName(id: number): string {
    return this.services().find(s => s.serviceId === id)?.serviceName ?? `Service #${id}`;
  }
}
