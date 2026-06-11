import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';
import { ICompany } from '../../../interfaces/i-service.interface';

@Component({
  selector: 'ca-admin-companies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-companies.component.html',
  styleUrls: ['./admin-companies.component.scss'],
})
export class AdminCompaniesComponent implements OnInit {
  private readonly auth   = inject(AuthService);
  private readonly admin  = inject(AdminService);
  private readonly router = inject(Router);

  items    = signal<ICompany[]>([]);
  loading  = signal(true);
  error    = signal<string | null>(null);
  page     = signal(1);
  pageSize = 10;
  hasMore  = signal(true);

  editingId       = signal<number | null>(null);
  editBuffer      = signal<Partial<ICompany>>({});
  saving          = signal(false);
  deleteConfirmId = signal<number | null>(null);

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user || !user.isAdmin) { this.router.navigate(['/']); return; }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.admin.getCompanies(this.page(), this.pageSize).subscribe({
      next: data => { this.items.set(data); this.hasMore.set(data.length === this.pageSize); this.loading.set(false); },
      error: () => { this.error.set('Failed to load companies.'); this.loading.set(false); }
    });
  }

  prevPage(): void { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage(): void { if (this.hasMore()) { this.page.update(p => p + 1); this.load(); } }

  startEdit(c: ICompany): void {
    this.editingId.set(c.company_id);
    this.editBuffer.set({ companyName: c.companyName, industry: c.industry, email: c.email, phone: c.phone, address: c.address, active: c.active });
  }
  cancelEdit(): void { this.editingId.set(null); }

  saveEdit(c: ICompany): void {
    this.saving.set(true);
    this.admin.updateCompany(c.company_id, this.editBuffer()).subscribe({
      next: updated => { this.items.update(list => list.map(i => i.company_id === updated.company_id ? updated : i)); this.editingId.set(null); this.saving.set(false); },
      error: () => { this.error.set('Failed to save.'); this.saving.set(false); }
    });
  }

  confirmDelete(id: number): void { this.deleteConfirmId.set(id); }
  cancelDelete(): void { this.deleteConfirmId.set(null); }
  doDelete(id: number): void {
    this.admin.deleteCompany(id).subscribe({
      next: () => { this.items.update(list => list.filter(i => i.company_id !== id)); this.deleteConfirmId.set(null); },
      error: () => { this.error.set('Failed to delete.'); this.deleteConfirmId.set(null); }
    });
  }
}
