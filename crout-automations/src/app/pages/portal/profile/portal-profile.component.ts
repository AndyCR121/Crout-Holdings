import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { IUser } from '../../../interfaces/i-service.interface';

@Component({
  selector: 'ca-portal-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './portal-profile.component.html',
  styleUrls: ['./portal-profile.component.scss'],
})
export class PortalProfileComponent {
  private readonly auth  = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly user = computed(() => this.auth.currentUser());

  username    = signal('');
  firstName   = signal('');
  surname     = signal('');
  company     = signal('');
  email       = signal('');
  cellNumber  = signal('');
  avatarUrl   = signal<string | null>(null);

  currentPw   = signal('');
  newPw       = signal('');
  confirmPw   = signal('');

  readonly saving   = signal(false);
  readonly savingPw = signal(false);

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
        this.toast.success('Profile updated successfully.');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.message ?? 'Failed to save profile. Please try again.');
      },
    });
  }

  savePassword(): void {
    if (!this.currentPw() || !this.newPw()) {
      this.toast.error('All password fields are required.'); return;
    }
    if (this.newPw() !== this.confirmPw()) {
      this.toast.error('New passwords do not match.'); return;
    }
    if (this.newPw().length < 8) {
      this.toast.error('Password must be at least 8 characters.'); return;
    }
    this.savingPw.set(true);
    this.auth.requestPasswordReset(this.email()).subscribe({
      next: () => {
        this.savingPw.set(false);
        this.currentPw.set('');
        this.newPw.set('');
        this.confirmPw.set('');
        this.toast.success('Password reset email sent. Check your inbox.');
      },
      error: () => {
        this.savingPw.set(false);
        this.toast.error('Password reset failed. Please try again.');
      },
    });
  }
}
