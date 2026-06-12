import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EnvironmentService } from './environment.service';
import { IUser, ICompany, IService, IPackage } from '../interfaces/i-service.interface';

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly env  = inject(EnvironmentService);
  private get base(): string { return this.env.apiUrl; }

  // ── Users ──────────────────────────────────────────────────────────────────
  getUsers(page = 1, pageSize = 10, search = ''): Observable<PagedResult<IUser>> {
    const params = `page=${page}&pageSize=${pageSize}${search ? '&search=' + encodeURIComponent(search) : ''}`;
    return this.http.get<PagedResult<IUser>>(`${this.base}/admin/users?${params}`);
  }
  createUser(body: Partial<IUser>): Observable<IUser> {
    return this.http.post<IUser>(`${this.base}/admin/users`, body);
  }
  updateUser(id: number, body: Partial<IUser>): Observable<IUser> {
    return this.http.put<IUser>(`${this.base}/admin/users/${id}`, body);
  }
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/users/${id}`);
  }
  toggleUserActive(id: number): Observable<{ active: boolean }> {
    return this.http.patch<{ active: boolean }>(`${this.base}/admin/users/${id}/toggle-active`, {});
  }
  toggleUserAdmin(id: number): Observable<{ isAdmin: boolean }> {
    return this.http.patch<{ isAdmin: boolean }>(`${this.base}/admin/users/${id}/toggle-admin`, {});
  }

  // ── Services ───────────────────────────────────────────────────────────────
  getServices(page = 1, pageSize = 10): Observable<IService[]> {
    return this.http.get<IService[]>(`${this.base}/services?page=${page}&pageSize=${pageSize}`);
  }
  createService(body: Partial<IService>): Observable<IService> {
    return this.http.post<IService>(`${this.base}/admin/services`, body);
  }
  updateService(id: number, body: Partial<IService>): Observable<IService> {
    return this.http.put<IService>(`${this.base}/admin/services/${id}`, body);
  }
  deleteService(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/services/${id}`);
  }

  // ── Packages ──────────────────────────────────────────────────────────────
  getPackages(page = 1, pageSize = 10): Observable<IPackage[]> {
    return this.http.get<IPackage[]>(`${this.base}/services/packages?page=${page}&pageSize=${pageSize}`);
  }
  createPackage(body: Partial<IPackage>): Observable<IPackage> {
    return this.http.post<IPackage>(`${this.base}/admin/packages`, body);
  }
  updatePackage(id: number, body: Partial<IPackage>): Observable<IPackage> {
    return this.http.put<IPackage>(`${this.base}/admin/packages/${id}`, body);
  }
  deletePackage(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/packages/${id}`);
  }

  // ── Companies ─────────────────────────────────────────────────────────────
  getCompanies(page = 1, pageSize = 10, search = ''): Observable<PagedResult<ICompany>> {
    const params = `page=${page}&pageSize=${pageSize}${search ? '&search=' + encodeURIComponent(search) : ''}`;
    return this.http.get<PagedResult<ICompany>>(`${this.base}/admin/companies?${params}`);
  }
  createCompany(body: Partial<ICompany>): Observable<ICompany> {
    return this.http.post<ICompany>(`${this.base}/admin/companies`, body);
  }
  updateCompany(id: number, body: Partial<ICompany>): Observable<ICompany> {
    return this.http.put<ICompany>(`${this.base}/admin/companies/${id}`, body);
  }
  deleteCompany(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/companies/${id}`);
  }
}
