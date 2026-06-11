import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, tap, catchError, map } from 'rxjs';
import { IUser } from '../interfaces/i-service.interface';
import { DEMO_USERS } from '../data/demo.data';

function getApiUrl(): string {
  return (window as any).__env?.apiUrl ?? '';
}

export interface ILoginPayload  { identifier: string; password: string; }
export interface ISignupPayload {
  username: string; email: string; password: string;
  firstName: string; surname: string;
}
export interface IAuthResponse  { token: string; user: IUser; }

/** Cookie helpers — JWT stored as HttpOnly-style cookie via server, but we also
 *  keep a non-sensitive "session" cookie for the client UI to detect auth state. */
function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}
function writeCookie(name: string, value: string, days = 7): void {
  const exp = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${exp};path=/;SameSite=Lax`;
}
function deleteCookie(name: string): void {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);
  private get base(): string { return getApiUrl(); }

  // ── Signals ──────────────────────────────────────────────────────────────
  readonly currentUser  = signal<IUser | null>(this._restoreUser());
  readonly isLoggedIn   = computed(() => this.currentUser() !== null);

  // ── Restore from cookie on init ──────────────────────────────────────────
  private _restoreUser(): IUser | null {
    const raw = readCookie('ca_user');
    if (!raw) return null;
    try { return JSON.parse(raw) as IUser; } catch { return null; }
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  login(payload: ILoginPayload): Observable<IUser> {
    return this.http
      .post<IAuthResponse>(`${this.base}/auth/login`, payload, { withCredentials: true })
      .pipe(
        map(r => r.user),
        tap(user => this._setSession(user)),
        catchError(() => {
          // Demo fallback — match by Username or Email + Password
          const found = DEMO_USERS.find(
            u => (u.Username === payload.identifier || u.Email === payload.identifier)
              && u.Password === payload.password
          );
          if (!found) throw new Error('Invalid credentials');
          this._setSession(found);
          return of(found);
        })
      );
  }

  // ── Sign Up ───────────────────────────────────────────────────────────────
  signup(payload: ISignupPayload): Observable<IUser> {
    return this.http
      .post<IAuthResponse>(`${this.base}/auth/signup`, payload, { withCredentials: true })
      .pipe(
        map(r => r.user),
        tap(user => this._setSession(user)),
        catchError(() => {
          // Demo: create a fake user locally (no Company — managed via ICompany)
          const fake: IUser = {
            user_id:    Date.now(),
            Username:   payload.username,
            Password:   payload.password,
            FirstName:  payload.firstName,
            Surname:    payload.surname,
            Email:      payload.email,
            CellNumber: null,
            Active:     true,
            IsAdmin:    false,
          };
          this._setSession(fake);
          return of(fake);
        })
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
    const user = this.currentUser()!;
    return this.http
      .patch<IUser>(`${this.base}/users/${user.user_id}`, updates, { withCredentials: true })
      .pipe(
        tap(updated => this._setSession(updated)),
        catchError(() => {
          const merged = { ...user, ...updates };
          this._setSession(merged);
          return of(merged);
        })
      );
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  logout(): void {
    this.http.post(`${this.base}/auth/logout`, {}, { withCredentials: true })
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        deleteCookie('ca_user');
        deleteCookie('ca_jwt');   // HttpOnly set by server; client delete is best-effort
        this.currentUser.set(null);
        this.router.navigate(['/']);
      });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  private _setSession(user: IUser): void {
    // Store non-sensitive user object in a readable cookie for UI hydration
    const safe: Partial<IUser> = { ...user, Password: '' };
    writeCookie('ca_user', JSON.stringify(safe), 7);
    this.currentUser.set(user);
  }
}
