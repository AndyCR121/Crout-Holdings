import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AdminService, PagedResult } from '../../../services/admin.service';
import { IService, IAddon } from '../../../interfaces/i-service.interface';

@Component({
  selector: 'ca-admin-services',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-services.component.html',
  styleUrls: ['./admin-services.component.scss'],
})
export class AdminServicesComponent implements OnInit {
  private readonly auth   = inject(AuthService);
  private readonly admin  = inject(AdminService);
  private readonly router = inject(Router);

  items    = signal<IService[]>([]);
  loading  = signal(true);
  error    = signal<string | null>(null);
  page     = signal(1);
  pageSize = 10;
  hasMore  = signal(true);

  editingId       = signal<number | null>(null);
  editBuffer      = signal<Partial<IService>>({});
  saving          = signal(false);
  deleteConfirmId = signal<number | null>(null);
  showCreate      = signal(false);
  createBuffer    = signal<Partial<IService>>({ serviceName: '', serviceDescription: '', price: 0, hasAddons: false, conditional: false });

  showLinkModal = signal(false);
  linkTarget    = signal<IService | null>(null);
  linkedAddons  = signal<IAddon[]>([]);
  linkLoading   = signal(false);

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user || !user.isAdmin) { this.router.navigate(['/']); return; }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.admin.getServices(this.page(), this.pageSize).subscribe({
      next: (data: IService[]) => { this.items.set(data); this.hasMore.set(data.length === this.pageSize); this.loading.set(false); },
      error: () => { this.error.set('Failed to load services.'); this.loading.set(false); }
    });
  }

  prevPage(): void { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage(): void { if (this.hasMore()) { this.page.update(p => p + 1); this.load(); } }

  startEdit(s: IService): void {
    this.editingId.set(s.serviceId);
    this.editBuffer.set({ serviceName: s.serviceName, serviceDescription: s.serviceDescription, price: s.price, hasAddons: s.hasAddons, conditional: s.conditional });
  }
  cancelEdit(): void { this.editingId.set(null); }

  saveEdit(s: IService): void {
    this.saving.set(true);
    this.admin.updateService(s.serviceId, this.editBuffer()).subscribe({
      next: (updated: IService) => { this.items.update(list => list.map(i => i.serviceId === updated.serviceId ? updated : i)); this.editingId.set(null); this.saving.set(false); },
      error: () => { this.error.set('Failed to save.'); this.saving.set(false); }
    });
  }

  confirmDelete(id: number): void { this.deleteConfirmId.set(id); }
  cancelDelete(): void { this.deleteConfirmId.set(null); }
  doDelete(id: number): void {
    this.admin.deleteService(id).subscribe({
      next: () => { this.items.update(list => list.filter(i => i.serviceId !== id)); this.deleteConfirmId.set(null); },
      error: () => { this.error.set('Failed to delete.'); this.deleteConfirmId.set(null); }
    });
  }

  submitCreate(): void {
    this.saving.set(true);
    this.admin.createService(this.createBuffer()).subscribe({
      next: (created: IService) => { this.items.update(list => [created, ...list]); this.showCreate.set(false); this.saving.set(false); this.createBuffer.set({ serviceName: '', serviceDescription: '', price: 0, hasAddons: false, conditional: false }); },
      error: () => { this.error.set('Failed to create.'); this.saving.set(false); }
    });
  }

  openLink(s: IService): void {
    this.linkTarget.set(s);
    this.linkLoading.set(true);
    this.showLinkModal.set(true);
    this.admin.getAddons(1, 100).subscribe({
      next: (result: PagedResult<IAddon>) => {
        this.linkedAddons.set(result.items.filter(a => a.serviceId === s.serviceId));
        this.linkLoading.set(false);
      },
      error: () => this.linkLoading.set(false)
    });
  }
}
