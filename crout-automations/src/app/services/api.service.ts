import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  IService,
  IAddon,
  IPackage,
  IUser,
  IUserService,
  IServiceConfig,
} from '../interfaces/i-service.interface';
import {
  DEMO_SERVICES,
  DEMO_ADDONS,
  DEMO_PACKAGES,
  DEMO_USERS,
  DEMO_USER_SERVICES,
} from '../data/demo.data';

/**
 * Reads the API base URL from the window-level env injected by WordPress/server.
 * Falls back to an empty string so calls fail gracefully and the demo fallback fires.
 *
 * Add to your WordPress theme's wp_head (or Elementor custom HTML):
 *   <script>window.__env = { apiUrl: 'https://api.crout-holdings.com' };</script>
 */
function getApiUrl(): string {
  return (window as any).__env?.apiUrl ?? '';
}

@Injectable({ providedIn: 'root' })
export class ApiService {

  private get base(): string { return getApiUrl(); }

  constructor(private http: HttpClient) {}

  // ─── Services ────────────────────────────────────────────────────────────

  getServices(): Observable<IService[]> {
    return this.http
      .get<IService[]>(`${this.base}/services`)
      .pipe(catchError(() => of(DEMO_SERVICES)));
  }

  getService(id: number): Observable<IService | undefined> {
    return this.http
      .get<IService>(`${this.base}/services/${id}`)
      .pipe(catchError(() => of(DEMO_SERVICES.find(s => s.service_id === id))));
  }

  // ─── Addons ──────────────────────────────────────────────────────────────

  getAddons(): Observable<IAddon[]> {
    return this.http
      .get<IAddon[]>(`${this.base}/addons`)
      .pipe(catchError(() => of(DEMO_ADDONS)));
  }

  getAddonsByService(serviceId: number): Observable<IAddon[]> {
    return this.http
      .get<IAddon[]>(`${this.base}/services/${serviceId}/addons`)
      .pipe(catchError(() => of(DEMO_ADDONS.filter(a => a.service_id === serviceId))));
  }

  // ─── Packages ────────────────────────────────────────────────────────────

  getPackages(): Observable<IPackage[]> {
    return this.http
      .get<IPackage[]>(`${this.base}/packages`)
      .pipe(catchError(() => of(DEMO_PACKAGES)));
  }

  getPackagesByService(serviceId: number): Observable<IPackage[]> {
    return this.http
      .get<IPackage[]>(`${this.base}/services/${serviceId}/packages`)
      .pipe(catchError(() => of(DEMO_PACKAGES.filter(p => p.service_id === serviceId))));
  }

  // ─── Users ───────────────────────────────────────────────────────────────

  getUsers(): Observable<IUser[]> {
    return this.http
      .get<IUser[]>(`${this.base}/users`)
      .pipe(catchError(() => of(DEMO_USERS)));
  }

  getUser(id: number): Observable<IUser | undefined> {
    return this.http
      .get<IUser>(`${this.base}/users/${id}`)
      .pipe(catchError(() => of(DEMO_USERS.find(u => u.user_id === id))));
  }

  // ─── User Services ───────────────────────────────────────────────────────

  getUserServices(userId: number): Observable<IUserService[]> {
    return this.http
      .get<IUserService[]>(`${this.base}/users/${userId}/services`)
      .pipe(catchError(() => of(DEMO_USER_SERVICES.filter(us => us.user_id === userId))));
  }

  // ─── Service Config ──────────────────────────────────────────────────────

  getServiceConfig(userId: number, serviceId: number): Observable<IServiceConfig | null> {
    return this.http
      .get<IServiceConfig>(`${this.base}/users/${userId}/services/${serviceId}/config`)
      .pipe(catchError(() => of(null)));
  }
}
