import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { AdminService, PagedResult } from '../../../services/admin.service';
import { IService, IAddon } from '../../../interfaces/i-service.interface';
import { AdminSidebarComponent } from '../../../components/admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'ca-admin-services',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent],
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
  createBuffer    = signal<Partial<IService>>({
    serviceName: '',
    serviceDescription: '',
    baseCost: 5000,
    tokensCost: 1000,
    totalTokens: 6000000,
    price: 6000,
    hasAddons: false,
    conditional: false
  });

  showLinkModal = signal(false);
  linkTarget    = signal<IService | null>(null);
  allAddons     = signal<IAddon[]>([]);
  linkSelected  = signal<Set<number>>(new Set());
  linkLoading   = signal(false);
  linkSaving    = signal(false);

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user?.isAdmin) { this.router.navigate(['/client/dashboard']); return; }
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
    this.editBuffer.set({
      serviceName: s.serviceName,
      serviceDescription: s.serviceDescription,
      baseCost: s.baseCost,
      tokensCost: s.tokensCost,
      totalTokens: s.totalTokens,
      price: s.price,
      hasAddons: s.hasAddons,
      conditional: s.conditional
    });
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
      next: (created: IService) => {
        this.items.update(list => [created, ...list]);
        this.showCreate.set(false);
        this.saving.set(false);
        this.createBuffer.set({
          serviceName: '',
          serviceDescription: '',
          baseCost: 5000,
          tokensCost: 1000,
          totalTokens: 6000000,
          price: 6000,
          hasAddons: false,
          conditional: false
        });
      },
      error: () => { this.error.set('Failed to create.'); this.saving.set(false); }
    });
  }

  openLink(s: IService): void {
    this.linkTarget.set(s);
    this.linkLoading.set(true);
    this.showLinkModal.set(true);
    this.admin.getAddons(1, 100).subscribe({
      next: (result: PagedResult<IAddon>) => {
        this.allAddons.set(result.items);
        this.linkSelected.set(new Set(result.items.filter(a => a.serviceIds.includes(s.serviceId) || a.serviceId === s.serviceId).map(a => a.addonId)));
        this.linkLoading.set(false);
      },
      error: () => this.linkLoading.set(false)
    });
  }

  toggleLink(addonId: number): void {
    const selected = new Set(this.linkSelected());
    selected.has(addonId) ? selected.delete(addonId) : selected.add(addonId);
    this.linkSelected.set(selected);
  }

  isLinked(addonId: number): boolean {
    return this.linkSelected().has(addonId);
  }

  saveLinks(): void {
    const service = this.linkTarget();
    if (!service) return;

    const requests = this.allAddons()
      .map(addon => {
        const currentlyLinked = addon.serviceIds.includes(service.serviceId) || addon.serviceId === service.serviceId;
        const shouldBeLinked = this.linkSelected().has(addon.addonId);
        if (currentlyLinked === shouldBeLinked) return null;

        const nextServiceIds = shouldBeLinked
          ? [...new Set([...addon.serviceIds, service.serviceId])]
          : addon.serviceIds.filter(id => id !== service.serviceId);

        return this.admin.linkServicesToAddon(addon.addonId, nextServiceIds);
      })
      .filter(request => request !== null);

    this.linkSaving.set(true);
    (requests.length ? forkJoin(requests) : of([])).subscribe({
      next: () => {
        this.linkSaving.set(false);
        this.showLinkModal.set(false);
        this.load();
      },
      error: () => {
        this.error.set('Failed to save add-on links.');
        this.linkSaving.set(false);
      }
    });
  }

  linkedAddonList(): IAddon[] {
    const serviceId = this.linkTarget()?.serviceId;
    if (!serviceId) return [];

    return this.allAddons()
      .filter(addon => addon.serviceIds.includes(serviceId) || addon.serviceId === serviceId)
      .sort((left, right) =>
        left.displayOrder - right.displayOrder
        || left.type.localeCompare(right.type)
        || left.addonName.localeCompare(right.addonName));
  }
}
