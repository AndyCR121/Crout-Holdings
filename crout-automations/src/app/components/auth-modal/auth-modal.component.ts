import {
  Component, inject, signal, output, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

type AuthTab = 'login' | 'signup';

@Component({
  selector: 'ca-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-modal.component.html',
  styleUrls: ['./auth-modal.component.scss'],
})
export class AuthModalComponent {
  readonly close  = output<void>();

  private readonly auth     = inject(AuthService);
  private readonly router   = inject(Router);
  private readonly toastSvc = inject(ToastService);

  tab        = signal<AuthTab>('login');
  loading    = signal(false);
  error      = signal<string | null>(null);

  // Login form
  loginId  = '';
  loginPwd = '';

  // Sign-up form — company is created post-signup via Profile > Companies
  signupUsername  = '';
  signupEmail     = '';
  signupFirstName = '';
  signupSurname   = '';
  signupPwd       = '';
  signupPwd2      = '';

  switchTab(t: AuthTab): void {
    this.tab.set(t);
    this.error.set(null);
  }

  submitLogin(): void {
    if (!this.loginId || !this.loginPwd) {
      this.error.set('Please fill in all fields.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.login({ identifier: this.loginId, password: this.loginPwd })
      .subscribe({
        next: (user) => {
          this.loading.set(false);
          this.close.emit();
          this.toastSvc.success(`Welcome back, ${user.firstName || user.username}!`);
          this.router.navigate(['/client/dashboard']);
        },
        error: (e: any) => {
          this.loading.set(false);
          this.error.set(e ? e.error : e.message ?? 'Login failed. Please try again.');
        },
      });
  }

  submitSignup(): void {
    if (!this.signupUsername || !this.signupEmail || !this.signupFirstName ||
        !this.signupSurname  || !this.signupPwd) {
      this.error.set('Please fill in all required fields.');
      return;
    }
    if (this.signupPwd !== this.signupPwd2) {
      this.error.set('Passwords do not match.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.signup({
      username:  this.signupUsername,
      email:     this.signupEmail,
      firstName: this.signupFirstName,
      surname:   this.signupSurname,
      password:  this.signupPwd,
    }).subscribe({
      next: (user) => {
        this.loading.set(false);
        this.close.emit();
        this.toastSvc.success(`Account created! Welcome, ${user.firstName || user.username}.`);
        this.router.navigate(['/client/dashboard']);
      },
      error: (e: Error) => {
        this.loading.set(false);
        this.error.set(e.message ?? 'Sign-up failed. Please try again.');
      },
    });
  }

  @HostListener('click', ['$event'])
  onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('ca-modal-backdrop')) {
      this.close.emit();
    }
  }
}
