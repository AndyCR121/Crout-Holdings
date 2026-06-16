import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EnvironmentService } from './environment.service';
import { IUser, ICompany, IService, IAddon, IServiceFeature, IPackage } from '../interfaces/i-service.interface';

export interface PagedResult<T> { items: T[]; total: number; page: number; pageSize: number; }

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly env  = inject(EnvironmentService);
  private get base(): string { return `${this.env.apiUrl}/admin`; }

  /** Read ca_jwt cookie and return Authorization headers. */
  private authHeaders(): HttpHeaders {
    const match = document.cookie.match(/(?:^|;\s*)ca_jwt=([^;]*)/);
    const token = match ? decodeURIComponent(match[1]) : '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ── Users ──────────────────────────────────────────────────────────────────
  getUsers(page = 1, pageSize = 20, search = ''): Observable<PagedResult<IUser>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize).set('search', search);
    return this.http.get<PagedResult<IUser>>(`${this.base}/users`, { params, headers: this.authHeaders(), withCredentials: true });
  }
  getUser(id: number): Observable<IUser> {
    return this.http.get<IUser>(`${this.base}/users/${id}`, { headers: this.authHeaders(), withCredentials: true });
  }
  createUser(dto: Partial<IUser>): Observable<IUser> {
    return this.http.post<IUser>(`${this.base}/users`, dto, { headers: this.authHeaders(), withCredentials: true });
  }
  updateUser(id: number, dto: Partial<IUser>): Observable<IUser> {
    return this.http.put<IUser>(`${this.base}/users/${id}`, dto, { headers: this.authHeaders(), withCredentials: true });
  }
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/users/${id}`, { headers: this.authHeaders(), withCredentials: true });
  }
  toggleActive(id: number): Observable<{ active: boolean }> {
    return this.http.patch<{ active: boolean }>(`${this.base}/users/${id}/toggle-active`, {}, { headers: this.authHeaders(), withCredentials: true });
  }
  toggleAdmin(id: number): Observable<{ isAdmin: boolean }> {
    return this.http.patch<{ isAdmin: boolean }>(`${this.base}/users/${id}/toggle-admin`, {}, { headers: this.authHeaders(), withCredentials: true });
  }

  // ── Companies ──────────────────────────────────────────────────────────────
  getCompanies(page = 1, pageSize = 20, search = ''): Observable<PagedResult<ICompany>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize).set('search', search);
    return this.http.get<PagedResult<ICompany>>(`${this.base}/companies`, { params, headers: this.authHeaders(), withCredentials: true });
  }
  getCompany(id: number): Observable<ICompany> {
    return this.http.get<ICompany>(`${this.base}/companies/${id}`, { headers: this.authHeaders(), withCredentials: true });
  }
  createCompany(dto: Partial<ICompany>): Observable<ICompany> {
    return this.http.post<ICompany>(`${this.base}/companies`, dto, { headers: this.authHeaders(), withCredentials: true });
  }
  updateCompany(id: number, dto: Partial<ICompany>): Observable<ICompany> {
    return this.http.put<ICompany>(`${this.base}/companies/${id}`, dto, { headers: this.authHeaders(), withCredentials: true });
  }
  deleteCompany(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/companies/${id}`, { headers: this.authHeaders(), withCredentials: true });
  }

  // ── Services ───────────────────────────────────────────────────────────────
  getServices(page = 1, pageSize = 100): Observable<IService[]> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedResult<IService>>(`${this.base}/services`, { params, headers: this.authHeaders(), withCredentials: true })
      .pipe(map(r => r.items));
  }
  getServicesPaged(page = 1, pageSize = 20): Observable<PagedResult<IService>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedResult<IService>>(`${this.base}/services`, { params, headers: this.authHeaders(), withCredentials: true });
  }
  createService(body: Partial<IService>): Observable<IService> {
    return this.http.post<IService>(`${this.base}/services`, body, { headers: this.authHeaders(), withCredentials: true });
  }
  updateService(id: number, body: Partial<IService>): Observable<IService> {
    return this.http.put<IService>(`${this.base}/services/${id}`, body, { headers: this.authHeaders(), withCredentials: true });
  }
  deleteService(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/services/${id}`, { headers: this.authHeaders(), withCredentials: true });
  }

  // ── Packages ───────────────────────────────────────────────────────────────
  getPackages(page = 1, pageSize = 20): Observable<PagedResult<IPackage>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedResult<IPackage>>(`${this.base}/packages`, { params, headers: this.authHeaders(), withCredentials: true });
  }
  getPackage(id: number): Observable<IPackage> {
    return this.http.get<IPackage>(`${this.base}/packages/${id}`, { headers: this.authHeaders(), withCredentials: true });
  }
  createPackage(dto: Partial<IPackage>): Observable<IPackage> {
    return this.http.post<IPackage>(`${this.base}/packages`, dto, { headers: this.authHeaders(), withCredentials: true });
  }
  updatePackage(id: number, dto: Partial<IPackage>): Observable<IPackage> {
    return this.http.put<IPackage>(`${this.base}/packages/${id}`, dto, { headers: this.authHeaders(), withCredentials: true });
  }
  deletePackage(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/packages/${id}`, { headers: this.authHeaders(), withCredentials: true });
  }
  linkServicesToPackage(packageId: number, serviceIds: number[]): Observable<any> {
    return this.http.put(`${this.base}/packages/${packageId}/services`, { serviceIds }, { headers: this.authHeaders(), withCredentials: true });
  }

  // ── Addons ─────────────────────────────────────────────────────────────────
  getAddons(page = 1, pageSize = 20): Observable<PagedResult<IAddon>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedResult<IAddon>>(`${this.base}/addons`, { params, headers: this.authHeaders(), withCredentials: true });
  }
  getAddon(id: number): Observable<IAddon> {
    return this.http.get<IAddon>(`${this.base}/addons/${id}`, { headers: this.authHeaders(), withCredentials: true });
  }
  createAddon(dto: Partial<IAddon>): Observable<IAddon> {
    return this.http.post<IAddon>(`${this.base}/addons`, dto, { headers: this.authHeaders(), withCredentials: true });
  }
  updateAddon(id: number, dto: Partial<IAddon>): Observable<IAddon> {
    return this.http.put<IAddon>(`${this.base}/addons/${id}`, dto, { headers: this.authHeaders(), withCredentials: true });
  }
  deleteAddon(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/addons/${id}`, { headers: this.authHeaders(), withCredentials: true });
  }

  // ── Service Features ───────────────────────────────────────────────────────
  getServiceFeatures(page = 1, pageSize = 20, serviceId?: number): Observable<PagedResult<IServiceFeature>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (serviceId) params = params.set('serviceId', serviceId);
    return this.http.get<PagedResult<IServiceFeature>>(`${this.base}/service-features`, { params, headers: this.authHeaders(), withCredentials: true });
  }
  getServiceFeature(id: number): Observable<IServiceFeature> {
    return this.http.get<IServiceFeature>(`${this.base}/service-features/${id}`, { headers: this.authHeaders(), withCredentials: true });
  }
  createServiceFeature(dto: Partial<IServiceFeature>): Observable<IServiceFeature> {
    return this.http.post<IServiceFeature>(`${this.base}/service-features`, dto, { headers: this.authHeaders(), withCredentials: true });
  }
  updateServiceFeature(id: number, dto: Partial<IServiceFeature>): Observable<IServiceFeature> {
    return this.http.put<IServiceFeature>(`${this.base}/service-features/${id}`, dto, { headers: this.authHeaders(), withCredentials: true });
  }
  deleteServiceFeature(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/service-features/${id}`, { headers: this.authHeaders(), withCredentials: true });
  }
}
