import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../services/toast.service';
import { EnvironmentService } from '../../../services/environment.service';
import { IUser, ICompany } from '../../../interfaces/i-service.interface';

@Component({
  selector: 'ca-portal-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './portal-profile.component.html',
  styleUrls: ['./portal-profile.component.scss'],
})
export class PortalProfileComponent implements OnInit {
  private readonly auth  = inject(AuthService);
  private readonly api   = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly http  = inject(HttpClient);
  private readonly env   = inject(EnvironmentService);
  private get base(): string { return this.env.apiUrl; }

  readonly user = computed(() => this.auth.currentUser());

  // ── Profile fields ──────────────────────────────────────────────────
  username   = signal('');
  firstName  = signal('');
  surname    = signal('');
  email      = signal('');
  cellNumber = signal('');
  avatarUrl  = signal<string | null>(null);

  readonly saving = signal(false);

  // ── Password fields ───────────────────────────────────────────────
  currentPw = signal('');
  newPw     = signal('');
  confirmPw = signal('');

  readonly savingPw = signal(false);

  // ── Company management ────────────────────────────────────────────
  readonly companies        = signal<ICompany[]>([]);
  readonly loadingCompanies = signal(true);
  readonly savingCompany    = signal(false);

  readonly showAddForm = signal(false);
  addName     = signal('');
  addIndustry = signal('');
  addEmail    = signal('');
  addPhone    = signal('');
  addVAT      = signal('');
  addReg      = signal('');
  addAddress  = signal('');

  readonly editingId = signal<number | null>(null);
  editName     = signal('');
  editIndustry = signal('');
  editEmail    = signal('');
  editPhone    = signal('');
  editVAT      = signal('');
  editReg      = signal('');
  editAddress  = signal('');

  constructor() {
    const u = this.user();
    if (u) {
      this.username.set(u.username ?? '');
      this.firstName.set(u.firstName ?? '');
      this.surname.set(u.surname ?? '');
      this.email.set(u.email ?? '');
      this.cellNumber.set(u.cellNumber ?? '');
    }
  }

  ngOnInit(): void {
    const uid = this.user()?.userId;
    if (uid == null) { this.loadingCompanies.set(false); return; }
    // Load companies from the authenticated profile endpoint
    this.http
      .get<ICompany[]>(`${this.base}/profile/companies`, { withCredentials: true })
      .subscribe({
        next:  c => { this.companies.set(c); this.loadingCompanies.set(false); },
        error: () => this.loadingCompanies.set(false),
      });
  }

  readonly initials = computed(() => {
    const u = this.user();
    if (!u) return '';
    return ((u.firstName?.[0] ?? '') + (u.surname?.[0] ?? '')).toUpperCase() || u.username[0].toUpperCase();
  });

  onAvatarChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.avatarUrl.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  // ── Profile save ───────────────────────────────────────────────────
  saveProfile(): void {
    this.saving.set(true);
    const updates: Partial<IUser> = {
      username:   this.username(),
      firstName:  this.firstName(),
      surname:    this.surname(),
      email:      this.email(),
      cellNumber: this.cellNumber(),
    };
    this.auth.updateProfile(updates).subscribe({
      next:  () => { this.saving.set(false); this.toast.success('Profile updated successfully.'); },
      error: (err) => { this.saving.set(false); this.toast.error(err?.message ?? 'Failed to save profile.'); },
    });
  }

  // ── Password save ─────────────────────────────────────────────────
  // Calls POST /api/profile/change-password with { currentPassword, newPassword }
  savePassword(): void {
    if (!this.currentPw() || !this.newPw()) { this.toast.error('All password fields are required.'); return; }
    if (this.newPw() !== this.confirmPw())   { this.toast.error('New passwords do not match.'); return; }
    if (this.newPw().length < 8)             { this.toast.error('Password must be at least 8 characters.'); return; }

    this.savingPw.set(true);
    this.http
      .post(
        `${this.base}/profile/change-password`,
        { currentPassword: this.currentPw(), newPassword: this.newPw() },
        { withCredentials: true }
      )
      .subscribe({
        next: () => {
          this.savingPw.set(false);
          this.currentPw.set(''); this.newPw.set(''); this.confirmPw.set('');
          this.toast.success('Password changed successfully.');
        },
        error: (err) => {
          this.savingPw.set(false);
          this.toast.error(err?.error?.error ?? 'Current password is incorrect.');
        },
      });
  }

  // ── Company: open add form ─────────────────────────────────────────────
  openAddCompany(): void {
    this.editingId.set(null);
    this.addName.set(''); this.addIndustry.set(''); this.addEmail.set('');
    this.addPhone.set(''); this.addVAT.set(''); this.addReg.set(''); this.addAddress.set('');
    this.showAddForm.set(true);
  }

  cancelAddCompany(): void { this.showAddForm.set(false); }

  // POST /api/profile/companies (auth via interceptor)
  saveNewCompany(): void {
    if (!this.addName().trim()) { this.toast.error('Company name is required.'); return; }
    this.savingCompany.set(true);
    const body = {
      companyName:        this.addName().trim(),
      industry:           this.addIndustry().trim() || null,
      email:              this.addEmail().trim() || null,
      phone:              this.addPhone().trim() || null,
      vatNumber:          this.addVAT().trim() || null,
      registrationNumber: this.addReg().trim() || null,
      address:            this.addAddress().trim() || null,
    };
    this.http
      .post<ICompany>(`${this.base}/profile/companies`, body, { withCredentials: true })
      .subscribe({
        next: (company) => {
          this.companies.update(c => [...c, company]);
          this.showAddForm.set(false);
          this.savingCompany.set(false);
          this.toast.success(`Company "${company.companyName}" added.`);
        },
        error: (err) => {
          this.savingCompany.set(false);
          this.toast.error(err?.error?.error ?? 'Failed to add company.');
        },
      });
  }

  // ── Company: open edit form ────────────────────────────────────────────
  openEditCompany(c: ICompany): void {
    this.showAddForm.set(false);
    this.editName.set(c.companyName);
    this.editIndustry.set(c.industry ?? '');
    this.editEmail.set(c.email ?? '');
    this.editPhone.set(c.phone ?? '');
    this.editVAT.set(c.vatNumber ?? '');
    this.editReg.set(c.registrationNumber ?? '');
    this.editAddress.set(c.address ?? '');
    this.editingId.set(c.companyId);
  }

  cancelEditCompany(): void { this.editingId.set(null); }

  // PUT /api/profile/companies/:id (auth via interceptor)
  saveEditCompany(c: ICompany): void {
    if (!this.editName().trim()) { this.toast.error('Company name is required.'); return; }
    this.savingCompany.set(true);
    const body = {
      companyName:        this.editName().trim(),
      industry:           this.editIndustry().trim() || null,
      email:              this.editEmail().trim() || null,
      phone:              this.editPhone().trim() || null,
      vatNumber:          this.editVAT().trim() || null,
      registrationNumber: this.editReg().trim() || null,
      address:            this.editAddress().trim() || null,
    };
    this.http
      .put<ICompany>(`${this.base}/profile/companies/${c.companyId}`, body, { withCredentials: true })
      .subscribe({
        next: (updated) => {
          this.companies.update(list => list.map(x => x.companyId === c.companyId ? updated : x));
          this.editingId.set(null);
          this.savingCompany.set(false);
          this.toast.success(`Company "${updated.companyName}" updated.`);
        },
        error: (err) => {
          this.savingCompany.set(false);
          this.toast.error(err?.error?.error ?? 'Failed to update company.');
        },
      });
  }

  // DELETE /api/profile/companies/:id (auth via interceptor)
  removeCompany(c: ICompany): void {
    if (!confirm(`Remove "${c.companyName}"? This cannot be undone.`)) return;
    this.http
      .delete(`${this.base}/profile/companies/${c.companyId}`, { withCredentials: true })
      .subscribe({
        next: () => {
          this.companies.update(list => list.filter(x => x.companyId !== c.companyId));
          this.toast.success(`Company "${c.companyName}" removed.`);
        },
        error: (err) => this.toast.error(err?.error?.error ?? 'Failed to remove company.'),
      });
  }
}
