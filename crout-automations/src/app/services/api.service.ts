import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  IService,
  IAddon,
  IPackage,
  IUser,
  ICompany,
  IUserService,
  IServiceConfig,
} from '../interfaces/i-service.interface';
import {
  DEMO_SERVICES,
  DEMO_ADDONS,
  DEMO_PACKAGES,
  DEMO_USERS,
  DEMO_COMPANIES,
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
      .pipe(catchError(() => of(DEMO_PACKAGES.filter(p => p.service_ids?.includes(serviceId)))));
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

  // ─── Companies ───────────────────────────────────────────────────────────

  getCompanies(): Observable<ICompany[]> {
    return this.http
      .get<ICompany[]>(`${this.base}/companies`)
      .pipe(catchError(() => of(DEMO_COMPANIES)));
  }

  getCompaniesByUser(userId: number): Observable<ICompany[]> {
    return this.http
      .get<ICompany[]>(`${this.base}/users/${userId}/companies`)
      .pipe(catchError(() => of(DEMO_COMPANIES.filter(c => c.user_id === userId))));
  }

  getCompany(companyId: number): Observable<ICompany | undefined> {
    return this.http
      .get<ICompany>(`${this.base}/companies/${companyId}`)
      .pipe(catchError(() => of(DEMO_COMPANIES.find(c => c.company_id === companyId))));
  }

  // ─── Company Services ─────────────────────────────────────────────────────

  getCompanyServices(companyId: number): Observable<IUserService[]> {
    return this.http
      .get<IUserService[]>(`${this.base}/companies/${companyId}/services`)
      .pipe(catchError(() => of(DEMO_USER_SERVICES.filter(us => us.company_id === companyId))));
  }

  // ─── Service Config ──────────────────────────────────────────────────────

  getServiceConfig(companyId: number, serviceId: number): Observable<IServiceConfig | null> {
    return this.http
      .get<IServiceConfig>(`${this.base}/companies/${companyId}/services/${serviceId}/config`)
      .pipe(catchError(() => of(null)));
  }
}
