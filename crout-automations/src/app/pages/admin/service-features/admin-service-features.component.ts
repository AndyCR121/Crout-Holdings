import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';
import { AdminLeftMenuComponent } from '../../../components/left-menu/admin-left-menu.component';

@Component({
  selector: 'ca-admin-service-features',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminLeftMenuComponent],
  templateUrl: './admin-service-features.component.html',
  styleUrls: ['./admin-service-features.component.scss'],
})
export class AdminServiceFeaturesComponent implements OnInit {
  private readonly auth    = inject(AuthService);
  private readonly admin   = inject(AdminService);
  private readonly confirm = inject(ConfirmDialogService);

  features = signal<any[]>([]);
  loading  = signal(true);
  error    = signal<string | null>(null);
  saving   = signal(false);
  drafts   = new Map<number, any>();
  showCreate   = signal(false);
  createBuffer = signal<any>({ featureName: '', description: '', active: true });

  ngOnInit(): void {
    if (!this.auth.currentUser()?.isAdmin) return;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.admin.getServiceFeatures().subscribe({
      next:  f  => { this.features.set(f); this.loading.set(false); },
      error: () => { this.error.set('Failed to load features.'); this.loading.set(false); }
    });
  }

  isEditing(id: number): boolean { return this.drafts.has(id); }
  getDraft(id: number): any { return this.drafts.get(id) ?? {}; }

  startEdit(f: any): void {
    this.drafts.set(f.featureId, { featureName: f.featureName, description: f.description, active: f.active });
  }

  cancelEdit(id: number): void { this.drafts.delete(id); }

  saveEdit(f: any): void {
    const draft = this.drafts.get(f.featureId);
    if (!draft) return;
    this.saving.set(true);
    this.admin.updateServiceFeature(f.featureId, draft).subscribe({
      next: updated => {
        this.features.update(list => list.map(x => x.featureId === updated.featureId ? updated : x));
        this.drafts.delete(f.featureId);
        this.saving.set(false);
      },
      error: () => { this.error.set('Failed to save feature.'); this.saving.set(false); }
    });
  }

  openCreate(): void {
    this.createBuffer.set({ featureName: '', description: '', active: true });
    this.showCreate.set(true);
  }

  submitCreate(): void {
    const buf = this.createBuffer();
    if (!buf.featureName?.trim()) { this.error.set('Feature name is required.'); return; }
    this.saving.set(true);
    this.admin.createServiceFeature(buf).subscribe({
      next: created => {
        this.features.update(list => [created, ...list]);
        this.showCreate.set(false);
        this.saving.set(false);
      },
      error: () => { this.error.set('Failed to create feature.'); this.saving.set(false); }
    });
  }

  async onDelete(f: any): Promise<void> {
    const ok = await this.confirm.open('Delete Feature', `Delete "${f.featureName}"? This cannot be undone.`);
    if (!ok) return;
    this.admin.deleteServiceFeature(f.featureId).subscribe({
      next: () => this.features.update(list => list.filter(x => x.featureId !== f.featureId)),
      error: () => this.error.set('Failed to delete feature.')
    });
  }
}
