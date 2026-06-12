import {
  Component, inject, signal, computed, HostListener, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { AuthModalComponent } from '../auth-modal/auth-modal.component';
import { ICompany } from '../../interfaces/i-service.interface';

@Component({
  selector: 'ca-account-button',
  standalone: true,
  imports: [CommonModule, AuthModalComponent],
  templateUrl: './account-button.component.html',
  styleUrls: ['./account-button.component.scss'],
})
export class AccountButtonComponent implements OnInit {
  private readonly auth   = inject(AuthService);
  private readonly api    = inject(ApiService);
  private readonly router = inject(Router);

  readonly loggedIn      = computed(() => this.auth.isLoggedIn());
  readonly user          = computed(() => this.auth.currentUser());
  readonly open          = signal(false);
  readonly showAuthModal = signal(false);
  readonly companies     = signal<ICompany[]>([]);

  readonly initials = computed(() => {
    const u = this.user();
    if (!u) return '';
    return ((u.firstName?.[0] ?? '') + (u.surname?.[0] ?? '')).toUpperCase() || u.username[0].toUpperCase();
  });

  /** First active company name — shown in the account button identity row. */
  readonly primaryCompany = computed(() =>
    this.companies().find(c => c.active)?.companyName ?? null
  );

  ngOnInit(): void {
    const uid = this.user()?.userId;
    if (uid == null) return;
    this.api.getCompaniesByUser(uid).subscribe(c => this.companies.set(c));
  }

  toggleDropdown(): void {
    if (!this.loggedIn()) {
      this.showAuthModal.set(true);
    } else {
      this.open.update(v => !v);
    }
  }

  closeModal(): void { this.showAuthModal.set(false); }

  navigate(path: string): void {
    this.open.set(false);
    this.router.navigate([path]);
  }

  logout(): void {
    this.open.set(false);
    this.auth.logout();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const host = (e.target as HTMLElement).closest('ca-account-button');
    if (!host) this.open.set(false);
  }
}
