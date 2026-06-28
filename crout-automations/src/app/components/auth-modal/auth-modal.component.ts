import {
  Component, HostListener, inject, output, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { getPasswordValidationErrors, isValidEmail } from '../../utils/auth-validation';

type AuthTab = 'login' | 'signup';
type AuthView = 'auth' | 'forgot-request' | 'forgot-verify' | 'forgot-reset';
type PasswordField = 'login' | 'signup' | 'signupConfirm' | 'reset' | 'resetConfirm';

@Component({
  selector: 'ca-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-modal.component.html',
  styleUrls: ['./auth-modal.component.scss'],
})
export class AuthModalComponent {
  readonly close = output<void>();

  private readonly auth = inject(AuthService);
  private readonly toastSvc = inject(ToastService);

  tab = signal<AuthTab>('login');
  view = signal<AuthView>('auth');
  loading = signal(false);
  error = signal<string | null>(null);
  readonly passwordVisibility = signal<Record<PasswordField, boolean>>({
    login: false,
    signup: false,
    signupConfirm: false,
    reset: false,
    resetConfirm: false,
  });

  loginId = '';
  loginPwd = '';

  signupUsername = '';
  signupEmail = '';
  signupFirstName = '';
  signupSurname = '';
  signupPwd = '';
  signupPwd2 = '';

  resetEmail = '';
  resetRequestId = '';
  resetOtp = '';
  resetPassword = '';
  resetConfirmPassword = '';

  switchTab(tab: AuthTab): void {
    this.tab.set(tab);
    this.view.set('auth');
    this.error.set(null);
  }

  openForgotPassword(): void {
    this.view.set('forgot-request');
    this.error.set(null);
    this.resetEmail = isValidEmail(this.loginId) ? this.loginId.trim() : this.resetEmail;
    this.clearResetFlow();
  }

  backToLogin(): void {
    this.view.set('auth');
    this.tab.set('login');
    this.error.set(null);
    this.clearResetFlow();
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
          window.location.href = '/client/dashboard';
        },
        error: (e: any) => {
          this.loading.set(false);
          this.error.set(e.error ? e.error.error ?? e.error.message : 'Login failed. Please try again.');
        },
      });
  }

  submitSignup(): void {
    if (!this.signupUsername || !this.signupEmail || !this.signupFirstName || !this.signupSurname || !this.signupPwd) {
      this.error.set('Please fill in all required fields.');
      return;
    }
    if (!isValidEmail(this.signupEmail)) {
      this.error.set('Enter a valid email address.');
      return;
    }
    if (this.signupPwd !== this.signupPwd2) {
      this.error.set('Passwords do not match.');
      return;
    }

    const passwordErrors = getPasswordValidationErrors(this.signupPwd);
    if (passwordErrors.length) {
      this.error.set(passwordErrors[0]);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.auth.signup({
      username: this.signupUsername,
      email: this.signupEmail,
      firstName: this.signupFirstName,
      surname: this.signupSurname,
      password: this.signupPwd,
    }).subscribe({
      next: (user) => {
        this.loading.set(false);
        this.close.emit();
        this.toastSvc.success(`Account created! Welcome, ${user.firstName || user.username}.`);
        window.location.href = '/client/dashboard';
      },
      error: (e: any) => {
        this.loading.set(false);
        this.error.set(e.error ? e.error.error ?? e.error.message : 'Sign-up failed. Please try again.');
      },
    });
  }

  submitPasswordResetRequest(): void {
    if (!isValidEmail(this.resetEmail)) {
      this.error.set('Enter a valid email address.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.auth.requestPasswordReset(this.resetEmail.trim()).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.resetRequestId = response.resetRequestId;
        this.resetOtp = '';
        this.view.set('forgot-verify');
        this.toastSvc.info('A 6-digit OTP has been sent to your email.');
      },
      error: (e: any) => {
        this.loading.set(false);
        this.error.set(e.error?.error ?? 'Could not send a reset code.');
      },
    });
  }

  resendPasswordResetOtp(): void {
    if (!this.resetRequestId) return;

    this.loading.set(true);
    this.error.set(null);
    this.auth.resendPasswordReset(this.resetRequestId).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.resetRequestId = response.resetRequestId;
        this.resetOtp = '';
        this.toastSvc.info('A new OTP has been sent.');
      },
      error: (e: any) => {
        this.loading.set(false);
        this.error.set(e.error?.error ?? 'Could not resend the OTP.');
      },
    });
  }

  verifyPasswordResetOtp(): void {
    if (!/^\d{6}$/.test(this.resetOtp)) {
      this.error.set('Enter the 6-digit OTP.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.auth.verifyPasswordResetOtp(this.resetRequestId, this.resetOtp).subscribe({
      next: () => {
        this.loading.set(false);
        this.view.set('forgot-reset');
        this.resetPassword = '';
        this.resetConfirmPassword = '';
      },
      error: (e: any) => {
        this.loading.set(false);
        this.error.set(e.error?.error ?? 'OTP verification failed.');
      },
    });
  }

  submitPasswordReset(): void {
    const passwordErrors = getPasswordValidationErrors(this.resetPassword);
    if (passwordErrors.length) {
      this.error.set(passwordErrors[0]);
      return;
    }
    if (this.resetPassword !== this.resetConfirmPassword) {
      this.error.set('Passwords do not match.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.auth.completePasswordReset(this.resetRequestId, this.resetPassword, this.resetConfirmPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.backToLogin();
        this.toastSvc.success('Password reset successful. Please sign in.');
      },
      error: (e: any) => {
        this.loading.set(false);
        this.error.set(e.error?.error ?? 'Could not reset your password.');
      },
    });
  }

  onOtpInput(value: string): void {
    this.resetOtp = value.replace(/\D/g, '').slice(0, 6);
  }

  onOtpInputEvent(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const sanitized = (input?.value ?? '').replace(/\D/g, '').slice(0, 6);
    this.resetOtp = sanitized;
    if (input && input.value !== sanitized) {
      input.value = sanitized;
    }
  }

  onOtpKeydown(event: KeyboardEvent): void {
    const allowedKeys = new Set([
      'Backspace',
      'Delete',
      'Tab',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'Enter',
    ]);
    const isShortcut = event.ctrlKey || event.metaKey;
    const isDigit = /^\d$/.test(event.key);

    if (isDigit || allowedKeys.has(event.key) || isShortcut) {
      return;
    }

    event.preventDefault();
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();

    const pasted = event.clipboardData?.getData('text') ?? '';
    this.resetOtp = pasted.replace(/\D/g, '').slice(0, 6);
  }

  isPasswordVisible(field: PasswordField): boolean {
    return this.passwordVisibility()[field];
  }

  togglePasswordVisibility(field: PasswordField): void {
    this.passwordVisibility.update(state => ({ ...state, [field]: !state[field] }));
  }

  private clearResetFlow(): void {
    this.resetRequestId = '';
    this.resetOtp = '';
    this.resetPassword = '';
    this.resetConfirmPassword = '';
  }

  @HostListener('click', ['$event'])
  onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('ca-modal-backdrop')) {
      this.close.emit();
    }
  }
}
