import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, tap, catchError, map, switchMap } from 'rxjs';
import { IUser } from '../interfaces/i-service.interface';
import { EnvironmentService } from './environment.service';
import { SUPPRESS_ERROR_TOAST } from '../interceptors/error.interceptor';

export interface ILoginPayload { identifier: string; password: string; }
export interface ISignupPayload {
  username: string; email: string; password: string;
  firstName: string; surname: string;
}
export interface IAuthResponse { token: string; user: IUser; }
export interface IPasswordResetSessionResponse { resetRequestId: string; }

/** Cookie helpers */
function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}
function writeCookie(name: string, value: string, days = 7): void {
  const exp    = new Date(Date.now() + days * 864e5).toUTCString();
  const secure = location.protocol === 'https:' ? ';Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${exp};path=/;SameSite=Lax${secure}`;
}
function deleteCookie(name: string): void {
  const secure = location.protocol === 'https:' ? ';Secure' : '';
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax${secure}`;
}

/**
 * profilePicture is stored as a raw base64 data URI which can exceed the
 * 4 KB browser cookie limit, silently truncating or failing the write.
 * We store it in localStorage under a separate key and rehydrate it onto
 * the user object after reading the lean cookie.
 */
const AVATAR_KEY = 'ca_avatar';

function readAvatar(): string | null {
  try { return localStorage.getItem(AVATAR_KEY); } catch { return null; }
}
function writeAvatar(url: string | null | undefined): void {
  try {
    if (url) { localStorage.setItem(AVATAR_KEY, url); }
    else      { localStorage.removeItem(AVATAR_KEY); }
  } catch { /* storage unavailable — fail silently */ }
}
function deleteAvatar(): void {
  try { localStorage.removeItem(AVATAR_KEY); } catch { /* ignore */ }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly env    = inject(EnvironmentService);
  private get base(): string { return this.env.apiUrl; }

  // ── Signals ───────────────────────────────────────────────────────────────
  readonly currentUser = signal<IUser | null>(this._restoreUser());
  readonly isLoggedIn  = computed(() => this.currentUser() !== null);

  // ── Restore from cookie + localStorage on init ────────────────────────────
  private _restoreUser(): IUser | null {
    const raw = readCookie('ca_user');
    if (!raw) return null;
    try {
      const user   = JSON.parse(raw) as IUser;
      const avatar = readAvatar();
      if (avatar) user.profilePicture = avatar;
      return user;
    } catch { return null; }
  }

  /**
   * Fetch the latest user record from GET /api/users/{id} and update the
   * session. Returns an Observable<IUser> so callers can await completion
   * before redirecting (e.g. login / signup flows).
   * Falls back silently — if the request fails the existing session is kept.
   */
  refreshUser(): Observable<IUser | null> {
    const uid = this.currentUser()?.userId;
    if (uid == null) return of(null);
    return this.http
      .get<IUser>(`${this.base}/users/${uid}`, { withCredentials: true })
      .pipe(
        tap(user => this._setSession(user)),
        catchError(() => of(null)),
      );
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  login(payload: ILoginPayload): Observable<IUser> {
    return this.http
      .post<IAuthResponse>(`${this.base}/auth/login`, payload, { withCredentials: true })
      .pipe(
        // 1. Persist JWT + basic user from auth response
        tap(r => this._setSession(r.user, r.token)),
        // 2. Wait for refreshUser() to complete — profilePicture is now in
        //    localStorage before the subscriber's next() callback fires,
        //    so the redirect happens with a fully-hydrated session.
        switchMap(r =>
          this.refreshUser().pipe(
            map(refreshed => refreshed ?? r.user),
          )
        ),
      );
  }

  // ── Sign Up ────────────────────────────────────────────────────────────────
  signup(payload: ISignupPayload): Observable<IUser> {
    return this.http
      .post<IAuthResponse>(`${this.base}/auth/signup`, payload, { withCredentials: true })
      .pipe(
        tap(r => this._setSession(r.user, r.token)),
        switchMap(r =>
          this.refreshUser().pipe(
            map(refreshed => refreshed ?? r.user),
          )
        ),
      );
  }

  // ── Password Reset Request ─────────────────────────────────────────────────
  requestPasswordReset(email: string): Observable<IPasswordResetSessionResponse> {
    const context = new HttpContext().set(SUPPRESS_ERROR_TOAST, true);
    return this.http
      .post<IPasswordResetSessionResponse>(`${this.base}/auth/password-reset/request`, { email }, { context });
  }

  resendPasswordReset(resetRequestId: string): Observable<IPasswordResetSessionResponse> {
    const context = new HttpContext().set(SUPPRESS_ERROR_TOAST, true);
    return this.http.post<IPasswordResetSessionResponse>(
      `${this.base}/auth/password-reset/resend`,
      { resetRequestId },
      { context },
    );
  }

  verifyPasswordResetOtp(resetRequestId: string, otp: string): Observable<void> {
    const context = new HttpContext().set(SUPPRESS_ERROR_TOAST, true);
    return this.http.post<void>(
      `${this.base}/auth/password-reset/verify`,
      { resetRequestId, otp },
      { context },
    );
  }

  completePasswordReset(resetRequestId: string, newPassword: string, confirmPassword: string): Observable<void> {
    const context = new HttpContext().set(SUPPRESS_ERROR_TOAST, true);
    return this.http.post<void>(
      `${this.base}/auth/password-reset/complete`,
      { resetRequestId, newPassword, confirmPassword },
      { context },
    );
  }

  // ── Update Profile ─────────────────────────────────────────────────────────
  updateProfile(updates: Partial<IUser>): Observable<IUser> {
    return this.http
      .put<IUser>(`${this.base}/profile`, updates, { withCredentials: true })
      .pipe(
        tap(updated => this._setSession(updated)),
        catchError(() => {
          const merged = { ...this.currentUser()!, ...updates };
          this._setSession(merged);
          return of(merged);
        })
      );
  }

  /**
   * Patch specific fields into the cached user session (signal + cookie).
   * Use after operations that return an updated user object (e.g. avatar upload).
   */
  patchUser(partial: Partial<IUser>): void {
    const current = this.currentUser();
    if (!current) return;
    this._setSession({ ...current, ...partial });
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  logout(): void {
    deleteCookie('ca_user');
    deleteCookie('ca_jwt');
    deleteAvatar();
    this.currentUser.set(null);

    this.http
      .post(`${this.base}/auth/logout`, {}, { withCredentials: true })
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  expireSession(redirectTo = '/'): void {
    deleteCookie('ca_user');
    deleteCookie('ca_jwt');
    deleteAvatar();
    this.currentUser.set(null);
    this.router.navigateByUrl(redirectTo);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  /**
   * Persist session:
   * - profilePicture → localStorage (can be hundreds of KB as base64)
   * - everything else → ca_user cookie (stays well under 4 KB)
   */
  private _setSession(user: IUser, token?: string): void {
    const { profilePicture, password, ...lean } = user as any;
    writeAvatar(profilePicture);
    writeCookie('ca_user', JSON.stringify({ ...lean, password: '' }), 7);
    if (token) writeCookie('ca_jwt', token, 7);
    this.currentUser.set({ ...lean, profilePicture: profilePicture ?? readAvatar() ?? undefined });
  }
}
