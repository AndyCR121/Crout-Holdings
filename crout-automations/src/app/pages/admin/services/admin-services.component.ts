import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { AdminService, PagedResult } from '../../../services/admin.service';
import { IService, IAddon } from '../../../interfaces/i-service.interface';
import { SERVICE_ICON_OPTIONS } from '../../../utils/service-display';

interface AddonLinkGroup {
  key: string;
  display: IAddon;
  members: IAddon[];
}

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

  readonly iconOptions = SERVICE_ICON_OPTIONS;

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
    conditional: false,
    displayName: '',
    displayTagline: '',
    iconKey: '',
    iconSvg: '',
  });

  showLinkModal = signal(false);
  linkTarget    = signal<IService | null>(null);
  allAddons     = signal<IAddon[]>([]);
  linkSelected  = signal<Set<string>>(new Set());
  linkLoading   = signal(false);
  linkSaving    = signal(false);
  readonly addonLinkGroups = computed(() => this.buildAddonLinkGroups(this.allAddons()));

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
      conditional: s.conditional,
      displayName: s.displayName,
      displayTagline: s.displayTagline,
      iconKey: s.iconKey,
      iconSvg: s.iconSvg,
      displayOrder: s.displayOrder,
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
          conditional: false,
          displayName: '',
          displayTagline: '',
          iconKey: '',
          iconSvg: '',
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
        this.linkSelected.set(new Set(
          this.buildAddonLinkGroups(result.items)
            .filter(group => group.members.some(member => member.serviceIds.includes(s.serviceId) || member.serviceId === s.serviceId))
            .map(group => group.key)));
        this.linkLoading.set(false);
      },
      error: () => this.linkLoading.set(false)
    });
  }

  toggleLink(groupKey: string): void {
    const selected = new Set(this.linkSelected());
    selected.has(groupKey) ? selected.delete(groupKey) : selected.add(groupKey);
    this.linkSelected.set(selected);
  }

  isLinked(groupKey: string): boolean {
    return this.linkSelected().has(groupKey);
  }

  saveLinks(): void {
    const service = this.linkTarget();
    if (!service) return;

    const requests = this.addonLinkGroups()
      .flatMap(group => group.members
        .map(addon => {
          const currentlyLinked = addon.serviceIds.includes(service.serviceId) || addon.serviceId === service.serviceId;
          const shouldBeLinked = this.linkSelected().has(group.key);
          if (currentlyLinked === shouldBeLinked) return null;

          const nextServiceIds = shouldBeLinked
            ? [...new Set([...addon.serviceIds, service.serviceId])]
            : addon.serviceIds.filter(id => id !== service.serviceId);

          return this.admin.linkServicesToAddon(addon.addonId, nextServiceIds);
        }))
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

  linkedAddonList(): AddonLinkGroup[] {
    const serviceId = this.linkTarget()?.serviceId;
    if (!serviceId) return [];

    return this.addonLinkGroups()
      .filter(group => group.members.some(addon => addon.serviceIds.includes(serviceId) || addon.serviceId === serviceId));
  }

  addonGroupMeta(group: AddonLinkGroup): string {
    const parts = [`#${group.display.addonId}`];
    const integrationNames = [...new Set(group.members.flatMap(addon => (addon.integrations ?? []).map(integration => integration.name)).filter(Boolean))];
    if (integrationNames.length) {
      parts.push(integrationNames.join(', '));
    }
    if (group.members.length > 1) {
      parts.push(`${group.members.length} matching records`);
    }
    return parts.join(' | ');
  }

  private buildAddonLinkGroups(addons: IAddon[]): AddonLinkGroup[] {
    const groups = new Map<string, IAddon[]>();
    for (const addon of addons) {
      const key = this.addonLinkGroupKey(addon);
      const members = groups.get(key) ?? [];
      members.push(addon);
      groups.set(key, members);
    }

    return [...groups.entries()]
      .map(([key, members]) => ({
        key,
        display: [...members].sort((left, right) => left.addonId - right.addonId)[0],
        members,
      }))
      .sort((left, right) =>
        left.display.displayOrder - right.display.displayOrder
        || left.display.type.localeCompare(right.display.type)
        || left.display.addonName.localeCompare(right.display.addonName)
        || left.display.addonId - right.display.addonId);
  }

  private addonLinkGroupKey(addon: IAddon): string {
    const normalizedDescription = (addon.addonDescription ?? '').trim().toLowerCase();
    const integrationIds = [...new Set((addon.integrations ?? []).map(integration => integration.id))].sort((left, right) => left - right);
    return [
      addon.addonName.trim().toLowerCase(),
      addon.type,
      addon.monthlyPrice.toFixed(2),
      normalizedDescription,
      integrationIds.join(','),
    ].join('|');
  }
}
