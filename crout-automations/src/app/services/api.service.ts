import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  IService,
  IAddon,
  IPackage,
  IUser,
  ICompany,
  IUserService,
  IServiceConfig,
} from '../interfaces/i-service.interface';

/**
 * Resolve the API base URL.
 * Priority: environment.apiUrl (set at build time) → window.__env.apiUrl (WordPress runtime inject)
 *
 * In development:  environment.apiUrl = 'http://localhost:3000'
 *                  The dev server proxy (proxy.conf.json) also forwards /api/* so
 *                  relative paths like '/api/services' work without CORS issues.
 * In production:   environment.apiUrl = '' so we fall through to window.__env.apiUrl
 *                  which WordPress injects via wp_inline_script before the bundle loads.
 */
function resolveApiUrl(): string {
  if (environment.apiUrl) return environment.apiUrl;
  const runtime = (window as any).__env?.apiUrl ?? '';
  if (!runtime) {
    console.warn(
      '[ApiService] No API URL found. Set environment.apiUrl (dev) or window.__env.apiUrl (production via WordPress).'
    );
  }
  return runtime;
}

@Injectable({ providedIn: 'root' })
export class ApiService {

  private readonly base = resolveApiUrl();

  constructor(private http: HttpClient) {}

  // ─── Services ────────────────────────────────────────────────────────────────

  getServices(): Observable<IService[]> {
    return this.http
      .get<IService[]>(`${this.base}/api/services`)
      .pipe(catchError(err => throwError(() => err)));
  }

  getService(id: number): Observable<IService> {
    return this.http
      .get<IService>(`${this.base}/api/services/${id}`)
      .pipe(catchError(err => throwError(() => err)));
  }

  // ─── Addons ───────────────────────────────────────────────────────────────────

  getAddons(): Observable<IAddon[]> {
    return this.http
      .get<IAddon[]>(`${this.base}/api/addons`)
      .pipe(catchError(err => throwError(() => err)));
  }

  getAddonsByService(serviceId: number): Observable<IAddon[]> {
    return this.http
      .get<IAddon[]>(`${this.base}/api/services/${serviceId}/addons`)
      .pipe(catchError(err => throwError(() => err)));
  }

  // ─── Packages ────────────────────────────────────────────────────────────────

  getPackages(): Observable<IPackage[]> {
    return this.http
      .get<IPackage[]>(`${this.base}/api/packages`)
      .pipe(catchError(err => throwError(() => err)));
  }

  getPackagesByService(serviceId: number): Observable<IPackage[]> {
    return this.http
      .get<IPackage[]>(`${this.base}/api/services/${serviceId}/packages`)
      .pipe(catchError(err => throwError(() => err)));
  }

  // ─── Users ────────────────────────────────────────────────────────────────────

  getUsers(): Observable<IUser[]> {
    return this.http
      .get<IUser[]>(`${this.base}/api/users`)
      .pipe(catchError(err => throwError(() => err)));
  }

  getUser(id: number): Observable<IUser> {
    return this.http
      .get<IUser>(`${this.base}/api/users/${id}`)
      .pipe(catchError(err => throwError(() => err)));
  }

  // ─── Companies ───────────────────────────────────────────────────────────────

  getCompanies(): Observable<ICompany[]> {
    return this.http
      .get<ICompany[]>(`${this.base}/api/companies`)
      .pipe(catchError(err => throwError(() => err)));
  }

  getCompaniesByUser(userId: number): Observable<ICompany[]> {
    return this.http
      .get<ICompany[]>(`${this.base}/api/users/${userId}/companies`)
      .pipe(catchError(err => throwError(() => err)));
  }

  getCompany(companyId: number): Observable<ICompany> {
    return this.http
      .get<ICompany>(`${this.base}/api/companies/${companyId}`)
      .pipe(catchError(err => throwError(() => err)));
  }

  // ─── Company Services ─────────────────────────────────────────────────────────

  getCompanyServices(companyId: number): Observable<IUserService[]> {
    return this.http
      .get<IUserService[]>(`${this.base}/api/companies/${companyId}/services`)
      .pipe(catchError(err => throwError(() => err)));
  }

  // ─── Service Config ───────────────────────────────────────────────────────────

  getServiceConfig(companyId: number, serviceId: number): Observable<IServiceConfig | null> {
    return this.http
      .get<IServiceConfig>(`${this.base}/api/companies/${companyId}/services/${serviceId}/config`)
      .pipe(catchError(err => throwError(() => err)));
  }
}
