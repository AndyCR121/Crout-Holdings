import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { IUser } from '../../../interfaces/i-service.interface';

@Component({
  selector: 'ca-portal-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './portal-profile.component.html',
  styleUrls: ['./portal-profile.component.scss'],
})
export class PortalProfileComponent {
  private readonly auth = inject(AuthService);

  readonly user = computed(() => this.auth.currentUser());

  // Edit form mirrors
  username    = signal('');
  firstName   = signal('');
  surname     = signal('');
  company     = signal('');
  email       = signal('');
  cellNumber  = signal('');
  avatarUrl   = signal<string | null>(null);

  // Password reset
  currentPw   = signal('');
  newPw       = signal('');
  confirmPw   = signal('');

  // UI state
  readonly saving       = signal(false);
  readonly savingPw     = signal(false);
  readonly saveSuccess  = signal(false);
  readonly saveError    = signal<string | null>(null);
  readonly pwSuccess    = signal(false);
  readonly pwError      = signal<string | null>(null);

  constructor() {
    const u = this.user();
    if (u) {
      this.username.set(u.Username ?? '');
      this.firstName.set(u.FirstName ?? '');
      this.surname.set(u.Surname ?? '');
      this.company.set(u.Company ?? '');
      this.email.set(u.Email ?? '');
      this.cellNumber.set(u.CellNumber ?? '');
    }
  }

  readonly initials = computed(() => {
    const u = this.user();
    if (!u) return '';
    return ((u.FirstName?.[0] ?? '') + (u.Surname?.[0] ?? '')).toUpperCase() || u.Username[0].toUpperCase();
  });

  onAvatarChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.avatarUrl.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  saveProfile(): void {
    this.saving.set(true);
    this.saveSuccess.set(false);
    this.saveError.set(null);

    const updates: Partial<IUser> = {
      Username:   this.username(),
      FirstName:  this.firstName(),
      Surname:    this.surname(),
      Company:    this.company() || null,
      Email:      this.email(),
      CellNumber: this.cellNumber() || null,
    };

    this.auth.updateProfile(updates).subscribe({
      next: () => {
        this.saving.set(false);
        this.saveSuccess.set(true);
        setTimeout(() => this.saveSuccess.set(false), 3000);
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError.set(err?.message ?? 'Failed to save. Please try again.');
      },
    });
  }

  savePassword(): void {
    this.pwSuccess.set(false);
    this.pwError.set(null);

    if (!this.currentPw() || !this.newPw()) {
      this.pwError.set('All password fields are required.'); return;
    }
    if (this.newPw() !== this.confirmPw()) {
      this.pwError.set('New passwords do not match.'); return;
    }
    if (this.newPw().length < 8) {
      this.pwError.set('Password must be at least 8 characters.'); return;
    }

    this.savingPw.set(true);
    this.auth.requestPasswordReset(this.email()).subscribe({
      next: () => {
        this.savingPw.set(false);
        this.pwSuccess.set(true);
        this.currentPw.set('');
        this.newPw.set('');
        this.confirmPw.set('');
        setTimeout(() => this.pwSuccess.set(false), 4000);
      },
      error: () => {
        this.savingPw.set(false);
        this.pwError.set('Password reset failed. Please try again.');
      },
    });
  }
}
