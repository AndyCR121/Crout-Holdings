import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';
import { IService } from '../../../interfaces/i-service.interface';
import { AdminLeftMenuComponent } from '../../../components/left-menu/admin-left-menu.component';

@Component({
  selector: 'ca-admin-services',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminLeftMenuComponent],
  templateUrl: './admin-services.component.html',
  styleUrls: ['./admin-services.component.scss'],
})
export class AdminServicesComponent implements OnInit {
  private readonly auth    = inject(AuthService);
  private readonly admin   = inject(AdminService);
  private readonly confirm = inject(ConfirmDialogService);

  services = signal<IService[]>([]);
  loading  = signal(true);
  error    = signal<string | null>(null);
  saving   = signal(false);

  drafts = new Map<number, Partial<IService>>();

  showCreate   = signal(false);
  createBuffer = signal<Partial<IService>>({ serviceName: '', description: '', price: 0, active: true });

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user?.isAdmin) return;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.admin.getServices().subscribe({
      next:  s  => { this.services.set(s); this.loading.set(false); },
      error: () => { this.error.set('Failed to load services.'); this.loading.set(false); }
    });
  }

  isEditing(id: number): boolean { return this.drafts.has(id); }
  getDraft(id: number): Partial<IService> { return this.drafts.get(id) ?? {}; }

  startEdit(s: IService): void {
    this.drafts.set(s.serviceId, { serviceName: s.serviceName, description: s.description, price: s.price, active: s.active });
  }

  cancelEdit(id: number): void { this.drafts.delete(id); }

  saveEdit(s: IService): void {
    const draft = this.drafts.get(s.serviceId);
    if (!draft) return;
    this.saving.set(true);
    this.admin.updateService(s.serviceId, draft).subscribe({
      next: updated => {
        this.services.update(list => list.map(x => x.serviceId === updated.serviceId ? updated : x));
        this.drafts.delete(s.serviceId);
        this.saving.set(false);
      },
      error: () => { this.error.set('Failed to save service.'); this.saving.set(false); }
    });
  }

  openCreate(): void {
    this.createBuffer.set({ serviceName: '', description: '', price: 0, active: true });
    this.showCreate.set(true);
  }

  submitCreate(): void {
    const buf = this.createBuffer();
    if (!buf.serviceName?.trim()) { this.error.set('Service name is required.'); return; }
    this.saving.set(true);
    this.admin.createService(buf).subscribe({
      next: created => {
        this.services.update(list => [created, ...list]);
        this.showCreate.set(false);
        this.saving.set(false);
      },
      error: () => { this.error.set('Failed to create service.'); this.saving.set(false); }
    });
  }

  async onDelete(s: IService): Promise<void> {
    const ok = await this.confirm.open('Delete Service', `Delete "${s.serviceName}"? This cannot be undone.`);
    if (!ok) return;
    this.admin.deleteService(s.serviceId).subscribe({
      next: () => this.services.update(list => list.filter(x => x.serviceId !== s.serviceId)),
      error: () => this.error.set('Failed to delete service.')
    });
  }
}
