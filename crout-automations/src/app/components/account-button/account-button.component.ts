import {
  Component, inject, signal, computed, HostListener, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CompanyService } from '../../services/company.service';
import { AuthModalComponent } from '../auth-modal/auth-modal.component';
import { ToastComponent } from '../toast/toast.component';

@Component({
  selector: 'ca-account-button',
  standalone: true,
  imports: [CommonModule, AuthModalComponent, ToastComponent],
  templateUrl: './account-button.component.html',
  styleUrls: ['./account-button.component.scss'],
})
export class AccountButtonComponent implements OnInit {
  private readonly auth     = inject(AuthService);
  private readonly companySvc = inject(CompanyService);
  private readonly router = inject(Router);

  readonly loggedIn      = computed(() => this.auth.isLoggedIn());
  readonly user          = computed(() => this.auth.currentUser());
  readonly open          = signal(false);
  readonly showAuthModal = signal(false);

  /** Read from shared cache — no extra HTTP call. */
  readonly primaryCompany = this.companySvc.primaryCompany;

  readonly initials = computed(() => {
    const u = this.user();
    if (!u) return '';
    return ((u.firstName?.[0] ?? '') + (u.surname?.[0] ?? '')).toUpperCase() || u.username[0].toUpperCase();
  });

  ngOnInit(): void {
    const uid = this.user()?.userId;
    if (uid == null) return;
    // Reads from cache — only fires an HTTP request if not already loaded.
    this.companySvc.load(uid);
  }

  toggleDropdown(): void {
    if (!this.loggedIn()) {
      this.showAuthModal.set(true);
    } else {
      this.open.update(v => !v);
    }
  }

  closeModal(): void { this.showAuthModal.set(false); }

  closeDropdown(): void { this.open.set(false); }

  navigate(path: string): void {
    this.open.set(false);
    if (document.querySelector('app-root')) {
      void this.router.navigateByUrl(path);
      return;
    }
    window.location.href = path;
  }

  logout(): void {
    this.open.set(false);
    this.companySvc.clear();
    this.auth.logout();
    if (document.querySelector('app-root')) {
      void this.router.navigateByUrl('/');
      return;
    }
    window.location.href = '/';
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const host = (e.target as HTMLElement).closest('ca-account-button');
    if (!host) this.open.set(false);
  }
}
