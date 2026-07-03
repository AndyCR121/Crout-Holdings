import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';
import { WorkflowCapabilityApiService } from '../../../services/workflow-capability-api.service';
import { IAddon, IService } from '../../../interfaces/i-service.interface';
import { IWorkflowIntegrationDefinition } from '../../../interfaces/i-workflow-capability.interface';
import { AdminSidebarComponent } from '../../../components/admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'ca-admin-addons',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent],
  templateUrl: './admin-addons.component.html',
  styleUrls: ['./admin-addons.component.scss'],
})
export class AdminAddonsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly admin = inject(AdminService);
  private readonly workflowApi = inject(WorkflowCapabilityApiService);
  private readonly router = inject(Router);

  items = signal<IAddon[]>([]);
  services = signal<IService[]>([]);
  integrations = signal<IWorkflowIntegrationDefinition[]>([]);
  total = signal(0);
  loading = signal(true);
  error = signal<string | null>(null);
  page = signal(1);
  pageSize = 10;
  hasMore = signal(true);

  editingId = signal<number | null>(null);
  editBuffer = signal<Partial<IAddon>>({});
  saving = signal(false);
  deleteConfirmId = signal<number | null>(null);
  showCreate = signal(false);
  createBuffer = signal<Partial<IAddon> & { integrationIds?: number[] }>({
    addonName: '',
    addonDescription: '',
    type: 'Action',
    monthlyPrice: 0,
    price: 0,
    serviceId: null,
    serviceIds: [],
    integrationIds: [],
    isActive: true,
    displayOrder: 0
  });

  showLinkModal = signal(false);
  linkTarget = signal<IAddon | null>(null);
  linkServiceIds = signal<Set<number>>(new Set());
  linkIntegrationIds = signal<Set<number>>(new Set());
  linkSaving = signal(false);

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user?.isAdmin) { this.router.navigate(['/client/dashboard']); return; }
    this.loadServices();
    this.loadIntegrations();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.admin.getAddons(this.page(), this.pageSize).subscribe({
      next: data => { this.items.set(data.items); this.total.set(data.total); this.hasMore.set(data.items.length === this.pageSize); this.loading.set(false); },
      error: () => { this.error.set('Failed to load addons.'); this.loading.set(false); }
    });
  }

  loadServices(): void {
    this.admin.getServices(1, 100).subscribe({ next: data => this.services.set(data) });
  }

  loadIntegrations(): void {
    this.workflowApi.getAdminIntegrationDefinitions(false).subscribe({ next: data => this.integrations.set(data) });
  }

  prevPage(): void { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage(): void { if (this.hasMore()) { this.page.update(p => p + 1); this.load(); } }

  startEdit(a: IAddon): void {
    this.editingId.set(a.addonId);
    this.editBuffer.set({
      addonName: a.addonName,
      addonDescription: a.addonDescription,
      type: a.type,
      monthlyPrice: a.monthlyPrice,
      price: a.price,
      serviceId: a.serviceId,
      serviceIds: a.serviceIds,
      isActive: a.isActive,
      displayOrder: a.displayOrder
    });
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
    this.admin.createAddon({
      ...this.createBuffer(),
      serviceIds: [...new Set(this.createBuffer().serviceIds ?? [])],
      integrationIds: [...new Set(this.createBuffer().integrationIds ?? [])],
    }).subscribe({
      next: created => {
        this.items.update(list => [created, ...list]);
        this.showCreate.set(false);
        this.saving.set(false);
        this.createBuffer.set({
          addonName: '',
          addonDescription: '',
          type: 'Action',
          monthlyPrice: 0,
          price: 0,
          serviceId: null,
          serviceIds: [],
          integrationIds: [],
          isActive: true,
          displayOrder: 0
        });
      },
      error: () => { this.error.set('Failed to create.'); this.saving.set(false); }
    });
  }

  openLink(a: IAddon): void {
    this.linkTarget.set(a);
    this.linkServiceIds.set(new Set(a.serviceIds));
    this.linkIntegrationIds.set(new Set((a.integrations ?? []).map(integration => integration.id)));
    this.showLinkModal.set(true);
  }

  getServiceName(id: number | null): string {
    if (!id) return '—';
    return this.services().find(s => s.serviceId === id)?.serviceName ?? `Service #${id}`;
  }

  serviceNames(addon: IAddon): string {
    if (!addon.serviceIds.length) return '—';
    return addon.serviceIds.map(id => this.getServiceName(id)).join(', ');
  }

  integrationNames(addon: IAddon): string {
    if (!addon.integrations?.length) return '—';
    return addon.integrations.map(integration => integration.name).join(', ');
  }

  toggleCreateService(serviceId: number): void {
    const next = new Set(this.createBuffer().serviceIds ?? []);
    next.has(serviceId) ? next.delete(serviceId) : next.add(serviceId);
    this.createBuffer.update(buffer => ({ ...buffer, serviceIds: [...next], serviceId: [...next][0] ?? null }));
  }

  toggleCreateIntegration(integrationId: number): void {
    const next = new Set(this.createBuffer().integrationIds ?? []);
    next.has(integrationId) ? next.delete(integrationId) : next.add(integrationId);
    this.createBuffer.update(buffer => ({ ...buffer, integrationIds: [...next] }));
  }

  isCreateServiceSelected(serviceId: number): boolean {
    return (this.createBuffer().serviceIds ?? []).includes(serviceId);
  }

  isCreateIntegrationSelected(integrationId: number): boolean {
    return (this.createBuffer().integrationIds ?? []).includes(integrationId);
  }

  toggleLinkedService(serviceId: number): void {
    const next = new Set(this.linkServiceIds());
    next.has(serviceId) ? next.delete(serviceId) : next.add(serviceId);
    this.linkServiceIds.set(next);
  }

  toggleLinkedIntegration(integrationId: number): void {
    const next = new Set(this.linkIntegrationIds());
    next.has(integrationId) ? next.delete(integrationId) : next.add(integrationId);
    this.linkIntegrationIds.set(next);
  }

  isLinkedService(serviceId: number): boolean {
    return this.linkServiceIds().has(serviceId);
  }

  isLinkedIntegration(integrationId: number): boolean {
    return this.linkIntegrationIds().has(integrationId);
  }

  saveLinks(): void {
    const addon = this.linkTarget();
    if (!addon) return;

    this.linkSaving.set(true);
    forkJoin([
      this.admin.linkServicesToAddon(addon.addonId, [...this.linkServiceIds()]),
      this.admin.linkIntegrationsToAddon(addon.addonId, [...this.linkIntegrationIds()]),
    ]).subscribe({
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
}
