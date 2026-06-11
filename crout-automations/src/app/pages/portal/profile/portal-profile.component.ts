import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../services/toast.service';
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

  readonly user = computed(() => this.auth.currentUser());

  // ── Profile fields ────────────────────────────────────────────────────────
  username    = signal('');
  firstName   = signal('');
  surname     = signal('');
  email       = signal('');
  cellNumber  = signal('');
  avatarUrl   = signal<string | null>(null);

  readonly saving = signal(false);

  // ── Password fields ───────────────────────────────────────────────────────
  currentPw  = signal('');
  newPw      = signal('');
  confirmPw  = signal('');

  readonly savingPw = signal(false);

  // ── Company management ────────────────────────────────────────────────────
  readonly companies       = signal<ICompany[]>([]);
  readonly loadingCompanies = signal(true);
  readonly savingCompany   = signal(false);

  // Inline add form
  readonly showAddForm     = signal(false);
  addName    = signal('');
  addIndustry = signal('');
  addEmail   = signal('');
  addPhone   = signal('');
  addVAT     = signal('');
  addReg     = signal('');
  addAddress = signal('');

  // Inline edit form — tracks which company_id is being edited (null = none)
  readonly editingId = signal<number | null>(null);
  editName    = signal('');
  editIndustry = signal('');
  editEmail   = signal('');
  editPhone   = signal('');
  editVAT     = signal('');
  editReg     = signal('');
  editAddress = signal('');

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
    const uid = this.user()?.user_id;
    if (uid == null) { this.loadingCompanies.set(false); return; }
    this.api.getCompaniesByUser(uid).subscribe({
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

  // ── Profile save ──────────────────────────────────────────────────────────
  saveProfile(): void {
    this.saving.set(true);
    const updates: Partial<IUser> = {
      username:   this.username(),
      firstName:  this.firstName(),
      surname:    this.surname(),
      email:      this.email(),
      cellNumber: this.cellNumber() || null,
    };
    this.auth.updateProfile(updates).subscribe({
      next: () => { this.saving.set(false); this.toast.success('Profile updated successfully.'); },
      error: (err) => { this.saving.set(false); this.toast.error(err?.message ?? 'Failed to save profile.'); },
    });
  }

  // ── Password save ─────────────────────────────────────────────────────────
  savePassword(): void {
    if (!this.currentPw() || !this.newPw()) { this.toast.error('All password fields are required.'); return; }
    if (this.newPw() !== this.confirmPw())   { this.toast.error('New passwords do not match.'); return; }
    if (this.newPw().length < 8)             { this.toast.error('Password must be at least 8 characters.'); return; }
    this.savingPw.set(true);
    this.auth.requestPasswordReset(this.email()).subscribe({
      next: () => {
        this.savingPw.set(false);
        this.currentPw.set(''); this.newPw.set(''); this.confirmPw.set('');
        this.toast.success('Password reset email sent. Check your inbox.');
      },
      error: () => { this.savingPw.set(false); this.toast.error('Password reset failed. Please try again.'); },
    });
  }

  // ── Company: open add form ─────────────────────────────────────────────────
  openAddCompany(): void {
    this.editingId.set(null);
    this.addName.set(''); this.addIndustry.set(''); this.addEmail.set('');
    this.addPhone.set(''); this.addVAT.set(''); this.addReg.set(''); this.addAddress.set('');
    this.showAddForm.set(true);
  }

  cancelAddCompany(): void { this.showAddForm.set(false); }

  saveNewCompany(): void {
    if (!this.addName().trim()) { this.toast.error('Company name is required.'); return; }
    this.savingCompany.set(true);
    const uid = this.user()!.user_id;
    const newCompany: ICompany = {
      company_id:          Date.now(),   // temp ID until API responds
      user_id:             uid,
      companyName:         this.addName().trim(),
      industry:            this.addIndustry().trim() || null,
      email:               this.addEmail().trim() || null,
      phone:               this.addPhone().trim() || null,
      VATNumber:           this.addVAT().trim() || null,
      registrationNumber:  this.addReg().trim() || null,
      address:             this.addAddress().trim() || null,
      active:              true,
    };
    // In a real app: POST /companies — demo fallback adds locally
    setTimeout(() => {
      this.companies.update(c => [...c, newCompany]);
      this.showAddForm.set(false);
      this.savingCompany.set(false);
      this.toast.success(`Company "${newCompany.companyName}" added.`);
    }, 600);
  }

  // ── Company: open edit form ────────────────────────────────────────────────
  openEditCompany(c: ICompany): void {
    this.showAddForm.set(false);
    this.editName.set(c.companyName);
    this.editIndustry.set(c.industry ?? '');
    this.editEmail.set(c.email ?? '');
    this.editPhone.set(c.phone ?? '');
    this.editVAT.set(c.VATNumber ?? '');
    this.editReg.set(c.registrationNumber ?? '');
    this.editAddress.set(c.address ?? '');
    this.editingId.set(c.company_id);
  }

  cancelEditCompany(): void { this.editingId.set(null); }

  saveEditCompany(c: ICompany): void {
    if (!this.editName().trim()) { this.toast.error('Company name is required.'); return; }
    this.savingCompany.set(true);
    const updated: ICompany = {
      ...c,
      companyName:         this.editName().trim(),
      industry:            this.editIndustry().trim() || null,
      email:               this.editEmail().trim() || null,
      phone:               this.editPhone().trim() || null,
      VATNumber:           this.editVAT().trim() || null,
      registrationNumber:  this.editReg().trim() || null,
      address:             this.editAddress().trim() || null,
    };
    setTimeout(() => {
      this.companies.update(list => list.map(x => x.company_id === c.company_id ? updated : x));
      this.editingId.set(null);
      this.savingCompany.set(false);
      this.toast.success(`Company "${updated.companyName}" updated.`);
    }, 600);
  }

  // ── Company: remove ───────────────────────────────────────────────────────
  removeCompany(c: ICompany): void {
    if (!confirm(`Remove "${c.companyName}"? This cannot be undone.`)) return;
    this.companies.update(list => list.filter(x => x.company_id !== c.company_id));
    this.toast.success(`Company "${c.companyName}" removed.`);
  }
}
