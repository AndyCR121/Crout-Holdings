import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';
import { ICompany } from '../../../interfaces/i-service.interface';

@Component({
  selector: 'ca-admin-companies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-companies.component.html',
  styleUrls: ['./admin-companies.component.scss'],
})
export class AdminCompaniesComponent implements OnInit {
  private readonly auth    = inject(AuthService);
  private readonly admin   = inject(AdminService);
  private readonly router  = inject(Router);
  private readonly confirm = inject(ConfirmDialogService);

  items    = signal<ICompany[]>([]);
  loading  = signal(true);
  error    = signal<string | null>(null);
  page     = signal(1);
  pageSize = 10;
  total    = signal(0);

  // Per-row draft map — fixes the "edit applies to all rows" bug
  drafts = new Map<number, Partial<ICompany>>();
  saving = signal(false);

  get totalPages(): number { return Math.ceil(this.total() / this.pageSize) || 1; }
  get hasMore(): boolean   { return this.page() < this.totalPages; }

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user?.isAdmin) { this.router.navigate(['/']); return; }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.drafts.clear();
    this.admin.getCompanies(this.page(), this.pageSize).subscribe({
      next: result => {
        this.items.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: () => { this.error.set('Failed to load companies.'); this.loading.set(false); }
    });
  }

  prevPage(): void { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage(): void { if (this.hasMore) { this.page.update(p => p + 1); this.load(); } }

  // ── Edit (isolated per row) ───────────────────────────────────────────────
  isEditing(id: number): boolean { return this.drafts.has(id); }

  getDraft(id: number): Partial<ICompany> { return this.drafts.get(id) ?? {}; }

  startEdit(c: ICompany): void {
    this.drafts.set(c.company_id, {
      companyName: c.companyName,
      industry:    c.industry,
      email:       c.email,
      phone:       c.phone,
      address:     c.address,
      active:      c.active,
    });
  }

  cancelEdit(id: number): void { this.drafts.delete(id); }

  saveEdit(c: ICompany): void {
    const draft = this.drafts.get(c.company_id);
    if (!draft) return;
    this.saving.set(true);
    this.admin.updateCompany(c.company_id, draft).subscribe({
      next: updated => {
        this.items.update(list => list.map(i => i.company_id === updated.company_id ? updated : i));
        this.drafts.delete(c.company_id);
        this.saving.set(false);
      },
      error: () => { this.error.set('Failed to save company.'); this.saving.set(false); }
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async onDelete(c: ICompany): Promise<void> {
    const confirmed = await this.confirm.open(
      'Delete Company',
      `Permanently delete "${c.companyName}"? This cannot be undone.`
    );
    if (!confirmed) return;
    this.admin.deleteCompany(c.company_id).subscribe({
      next: () => {
        this.items.update(list => list.filter(i => i.company_id !== c.company_id));
        this.total.update(t => t - 1);
      },
      error: () => this.error.set('Failed to delete company.')
    });
  }
}
