import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, tap, catchError, map } from 'rxjs';
import { IUser } from '../interfaces/i-service.interface';
import { EnvironmentService } from './environment.service';

export interface ILoginPayload { identifier: string; password: string; }
export interface ISignupPayload {
  username: string; email: string; password: string;
  firstName: string; surname: string;
}
export interface IAuthResponse { token: string; user: IUser; }

/** Cookie helpers */
function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}
function writeCookie(name: string, value: string, days = 7): void {
  const exp      = new Date(Date.now() + days * 864e5).toUTCString();
  const secure   = location.protocol === 'https:' ? ';Secure' : '';
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

  // ── Signals ──────────────────────────────────────────────────────────────
  readonly currentUser = signal<IUser | null>(this._restoreUser());
  readonly isLoggedIn  = computed(() => this.currentUser() !== null);

  // ── Restore from cookie + localStorage on init ───────────────────────────
  private _restoreUser(): IUser | null {
    const raw = readCookie('ca_user');
    if (!raw) return null;
    try {
      const user = JSON.parse(raw) as IUser;
      // Rehydrate the picture from localStorage (not stored in cookie)
      const avatar = readAvatar();
      if (avatar) user.profilePicture = avatar;
      return user;
    } catch { return null; }
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  login(payload: ILoginPayload): Observable<IUser> {
    return this.http
      .post<IAuthResponse>(`${this.base}/auth/login`, payload, { withCredentials: true })
      .pipe(
        tap(r => this._setSession(r.user, r.token)),
        map(r => r.user),
      );
  }

  // ── Sign Up ───────────────────────────────────────────────────────────────
  signup(payload: ISignupPayload): Observable<IUser> {
    return this.http
      .post<IAuthResponse>(`${this.base}/auth/signup`, payload, { withCredentials: true })
      .pipe(
        tap(r => this._setSession(r.user, r.token)),
        map(r => r.user),
      );
  }

  // ── Password Reset Request ─────────────────────────────────────────────────
  requestPasswordReset(email: string): Observable<void> {
    return this.http
      .post<void>(`${this.base}/auth/reset-password`, { email })
      .pipe(catchError(() => of(undefined as void)));
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
   * Use after operations that return an updated user object (e.g. avatar upload)
   * without needing to call the full PUT /profile endpoint.
   */
  patchUser(partial: Partial<IUser>): void {
    const current = this.currentUser();
    if (!current) return;
    this._setSession({ ...current, ...partial });
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  /**
   * Clears the session immediately (cookies + localStorage + signal), then fires
   * the server-side logout in the background.
   */
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

  // ── Helpers ─────────────────────────────────────────────────────────────────
  /**
   * Persist session:
   * - profilePicture → localStorage (can be hundreds of KB as base64)
   * - everything else → ca_user cookie (stays well under 4 KB)
   */
  private _setSession(user: IUser, token?: string): void {
    // Separate the picture before writing to the cookie
    const { profilePicture, password, ...lean } = user as any;

    writeAvatar(profilePicture);
    writeCookie('ca_user', JSON.stringify({ ...lean, password: '' }), 7);
    if (token) writeCookie('ca_jwt', token, 7);

    // Signal always carries the full user including picture
    this.currentUser.set({ ...lean, profilePicture: profilePicture ?? readAvatar() ?? undefined });
  }
}
