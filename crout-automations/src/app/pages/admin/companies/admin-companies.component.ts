import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';
import { ICompany } from '../../../interfaces/i-service.interface';
import { AdminLeftMenuComponent } from '../../../components/left-menu/admin-left-menu.component';

@Component({
  selector: 'ca-admin-companies',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminLeftMenuComponent],
  templateUrl: './admin-companies.component.html',
  styleUrls: ['./admin-companies.component.scss'],
})
export class AdminCompaniesComponent implements OnInit {
  private readonly auth    = inject(AuthService);
  private readonly admin   = inject(AdminService);
  private readonly confirm = inject(ConfirmDialogService);

  companies = signal<ICompany[]>([]);
  loading   = signal(true);
  error     = signal<string | null>(null);
  saving    = signal(false);
  drafts    = new Map<number, Partial<ICompany>>();
  showCreate   = signal(false);
  createBuffer = signal<Partial<ICompany>>({ companyName: '', industry: '', email: '', phone: '' });

  ngOnInit(): void {
    if (!this.auth.currentUser()?.isAdmin) return;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.admin.getCompanies().subscribe({
      next:  c  => { this.companies.set(c); this.loading.set(false); },
      error: () => { this.error.set('Failed to load companies.'); this.loading.set(false); }
    });
  }

  isEditing(id: number): boolean { return this.drafts.has(id); }
  getDraft(id: number): Partial<ICompany> { return this.drafts.get(id) ?? {}; }

  startEdit(c: ICompany): void {
    this.drafts.set(c.companyId, { companyName: c.companyName, industry: c.industry, email: c.email, phone: c.phone, address: c.address });
  }

  cancelEdit(id: number): void { this.drafts.delete(id); }

  saveEdit(c: ICompany): void {
    const draft = this.drafts.get(c.companyId);
    if (!draft) return;
    this.saving.set(true);
    this.admin.updateCompany(c.companyId, draft).subscribe({
      next: updated => {
        this.companies.update(list => list.map(x => x.companyId === updated.companyId ? updated : x));
        this.drafts.delete(c.companyId);
        this.saving.set(false);
      },
      error: () => { this.error.set('Failed to save company.'); this.saving.set(false); }
    });
  }

  openCreate(): void {
    this.createBuffer.set({ companyName: '', industry: '', email: '', phone: '' });
    this.showCreate.set(true);
  }

  submitCreate(): void {
    const buf = this.createBuffer();
    if (!buf.companyName?.trim()) { this.error.set('Company name is required.'); return; }
    this.saving.set(true);
    this.admin.createCompany(buf).subscribe({
      next: created => {
        this.companies.update(list => [created, ...list]);
        this.showCreate.set(false);
        this.saving.set(false);
      },
      error: () => { this.error.set('Failed to create company.'); this.saving.set(false); }
    });
  }

  async onDelete(c: ICompany): Promise<void> {
    const ok = await this.confirm.open('Delete Company', `Delete "${c.companyName}"? This cannot be undone.`);
    if (!ok) return;
    this.admin.deleteCompany(c.companyId).subscribe({
      next: () => this.companies.update(list => list.filter(x => x.companyId !== c.companyId)),
      error: () => this.error.set('Failed to delete company.')
    });
  }
}
