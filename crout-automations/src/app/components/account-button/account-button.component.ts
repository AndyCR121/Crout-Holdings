import {
  Component, inject, signal, computed,
  HostListener, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AuthModalComponent } from '../auth-modal/auth-modal.component';

@Component({
  selector: 'ca-account-button',
  standalone: true,
  imports: [CommonModule, RouterModule, AuthModalComponent],
  templateUrl: './account-button.component.html',
  styleUrls: ['./account-button.component.scss'],
})
export class AccountButtonComponent {
  readonly auth    = inject(AuthService);
  private readonly router  = inject(Router);
  private readonly elRef   = inject(ElementRef);

  readonly open         = signal(false);
  readonly showAuthModal = signal(false);

  readonly user    = computed(() => this.auth.currentUser());
  readonly loggedIn = computed(() => this.auth.isLoggedIn());

  /** Initials fallback when no profile picture */
  readonly initials = computed(() => {
    const u = this.user();
    if (!u) return '';
    return ((u.FirstName?.[0] ?? '') + (u.Surname?.[0] ?? '')).toUpperCase() || u.Username[0].toUpperCase();
  });

  toggleDropdown(): void {
    if (!this.loggedIn()) {
      this.showAuthModal.set(true);
      return;
    }
    this.open.update(v => !v);
  }

  navigate(path: string): void {
    this.open.set(false);
    this.router.navigate([path]);
  }

  logout(): void {
    this.open.set(false);
    this.auth.logout();
  }

  closeModal(): void {
    this.showAuthModal.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (this.open() && !this.elRef.nativeElement.contains(e.target)) {
      this.open.set(false);
    }
  }
}
