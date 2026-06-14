import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';
import { AdminLeftMenuComponent } from '../../../components/left-menu/admin-left-menu.component';

@Component({
  selector: 'ca-admin-addons',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminLeftMenuComponent],
  templateUrl: './admin-addons.component.html',
  styleUrls: ['./admin-addons.component.scss'],
})
export class AdminAddonsComponent implements OnInit {
  private readonly auth    = inject(AuthService);
  private readonly admin   = inject(AdminService);
  private readonly confirm = inject(ConfirmDialogService);

  addons   = signal<any[]>([]);
  loading  = signal(true);
  error    = signal<string | null>(null);
  saving   = signal(false);
  drafts   = new Map<number, any>();
  showCreate   = signal(false);
  createBuffer = signal<any>({ addonName: '', description: '', price: 0, active: true });

  ngOnInit(): void {
    if (!this.auth.currentUser()?.isAdmin) return;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.admin.getAddons().subscribe({
      next:  a  => { this.addons.set(a); this.loading.set(false); },
      error: () => { this.error.set('Failed to load addons.'); this.loading.set(false); }
    });
  }

  isEditing(id: number): boolean { return this.drafts.has(id); }
  getDraft(id: number): any { return this.drafts.get(id) ?? {}; }

  startEdit(a: any): void {
    this.drafts.set(a.addonId, { addonName: a.addonName, description: a.description, price: a.price, active: a.active });
  }

  cancelEdit(id: number): void { this.drafts.delete(id); }

  saveEdit(a: any): void {
    const draft = this.drafts.get(a.addonId);
    if (!draft) return;
    this.saving.set(true);
    this.admin.updateAddon(a.addonId, draft).subscribe({
      next: updated => {
        this.addons.update(list => list.map(x => x.addonId === updated.addonId ? updated : x));
        this.drafts.delete(a.addonId);
        this.saving.set(false);
      },
      error: () => { this.error.set('Failed to save addon.'); this.saving.set(false); }
    });
  }

  openCreate(): void {
    this.createBuffer.set({ addonName: '', description: '', price: 0, active: true });
    this.showCreate.set(true);
  }

  submitCreate(): void {
    const buf = this.createBuffer();
    if (!buf.addonName?.trim()) { this.error.set('Addon name is required.'); return; }
    this.saving.set(true);
    this.admin.createAddon(buf).subscribe({
      next: created => {
        this.addons.update(list => [created, ...list]);
        this.showCreate.set(false);
        this.saving.set(false);
      },
      error: () => { this.error.set('Failed to create addon.'); this.saving.set(false); }
    });
  }

  async onDelete(a: any): Promise<void> {
    const ok = await this.confirm.open('Delete Addon', `Delete "${a.addonName}"? This cannot be undone.`);
    if (!ok) return;
    this.admin.deleteAddon(a.addonId).subscribe({
      next: () => this.addons.update(list => list.filter(x => x.addonId !== a.addonId)),
      error: () => this.error.set('Failed to delete addon.')
    });
  }
}
