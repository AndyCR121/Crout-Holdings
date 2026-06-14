import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';
import { AdminLeftMenuComponent } from '../../../components/left-menu/admin-left-menu.component';

@Component({
  selector: 'ca-admin-packages',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminLeftMenuComponent],
  templateUrl: './admin-packages.component.html',
  styleUrls: ['./admin-packages.component.scss'],
})
export class AdminPackagesComponent implements OnInit {
  private readonly auth    = inject(AuthService);
  private readonly admin   = inject(AdminService);
  private readonly confirm = inject(ConfirmDialogService);

  packages = signal<any[]>([]);
  loading  = signal(true);
  error    = signal<string | null>(null);
  saving   = signal(false);
  drafts   = new Map<number, any>();
  showCreate   = signal(false);
  createBuffer = signal<any>({ packageName: '', description: '', price: 0, active: true });

  ngOnInit(): void {
    if (!this.auth.currentUser()?.isAdmin) return;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.admin.getPackages().subscribe({
      next:  p  => { this.packages.set(p); this.loading.set(false); },
      error: () => { this.error.set('Failed to load packages.'); this.loading.set(false); }
    });
  }

  isEditing(id: number): boolean { return this.drafts.has(id); }
  getDraft(id: number): any { return this.drafts.get(id) ?? {}; }

  startEdit(p: any): void {
    this.drafts.set(p.packageId, { packageName: p.packageName, description: p.description, price: p.price, active: p.active });
  }

  cancelEdit(id: number): void { this.drafts.delete(id); }

  saveEdit(p: any): void {
    const draft = this.drafts.get(p.packageId);
    if (!draft) return;
    this.saving.set(true);
    this.admin.updatePackage(p.packageId, draft).subscribe({
      next: updated => {
        this.packages.update(list => list.map(x => x.packageId === updated.packageId ? updated : x));
        this.drafts.delete(p.packageId);
        this.saving.set(false);
      },
      error: () => { this.error.set('Failed to save package.'); this.saving.set(false); }
    });
  }

  openCreate(): void {
    this.createBuffer.set({ packageName: '', description: '', price: 0, active: true });
    this.showCreate.set(true);
  }

  submitCreate(): void {
    const buf = this.createBuffer();
    if (!buf.packageName?.trim()) { this.error.set('Package name is required.'); return; }
    this.saving.set(true);
    this.admin.createPackage(buf).subscribe({
      next: created => {
        this.packages.update(list => [created, ...list]);
        this.showCreate.set(false);
        this.saving.set(false);
      },
      error: () => { this.error.set('Failed to create package.'); this.saving.set(false); }
    });
  }

  async onDelete(p: any): Promise<void> {
    const ok = await this.confirm.open('Delete Package', `Delete "${p.packageName}"? This cannot be undone.`);
    if (!ok) return;
    this.admin.deletePackage(p.packageId).subscribe({
      next: () => this.packages.update(list => list.filter(x => x.packageId !== p.packageId)),
      error: () => this.error.set('Failed to delete package.')
    });
  }
}
