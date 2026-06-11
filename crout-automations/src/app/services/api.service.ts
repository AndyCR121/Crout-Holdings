import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EnvironmentService } from './environment.service';
import {
  IService,
  IAddon,
  IPackage,
  IUser,
  ICompany,
  IUserService,
  IServiceConfig,
} from '../interfaces/i-service.interface';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly env  = inject(EnvironmentService);
  private get base(): string { return this.env.apiUrl; }

  // ─── Services ────────────────────────────────────────────────────────────

  getServices(): Observable<IService[]> {
    return this.http
      .get<IService[]>(`${this.base}/services`)
      .pipe(catchError(err => throwError(() => err)));
  }

  getService(id: number): Observable<IService> {
    return this.http
      .get<IService>(`${this.base}/services/${id}`)
      .pipe(catchError(err => throwError(() => err)));
  }

  // ─── Addons ───────────────────────────────────────────────────────────────

  getAddonsByService(serviceId: number): Observable<IAddon[]> {
    return this.http
      .get<IAddon[]>(`${this.base}/services/${serviceId}/addons`)
      .pipe(catchError(err => throwError(() => err)));
  }

  // ─── Packages ─────────────────────────────────────────────────────────────

  getAllPackages(): Observable<IPackage[]> {
    return this.http
      .get<IPackage[]>(`${this.base}/services/packages`)
      .pipe(catchError(err => throwError(() => err)));
  }

  getPackagesByService(serviceId: number): Observable<IPackage[]> {
    return this.http
      .get<IPackage[]>(`${this.base}/services/${serviceId}/packages`)
      .pipe(catchError(err => throwError(() => err)));
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  getUser(id: number): Observable<IUser> {
    return this.http
      .get<IUser>(`${this.base}/users/${id}`)
      .pipe(catchError(err => throwError(() => err)));
  }

  // ─── Companies ────────────────────────────────────────────────────────────

  getCompaniesByUser(userId: number): Observable<ICompany[]> {
    return this.http
      .get<ICompany[]>(`${this.base}/users/${userId}/companies`)
      .pipe(catchError(err => throwError(() => err)));
  }

  getCompany(companyId: number): Observable<ICompany> {
    return this.http
      .get<ICompany>(`${this.base}/companies/${companyId}`)
      .pipe(catchError(err => throwError(() => err)));
  }

  // ─── Company Services ─────────────────────────────────────────────────────

  getCompanyServices(companyId: number): Observable<IUserService[]> {
    return this.http
      .get<IUserService[]>(`${this.base}/companies/${companyId}/services`)
      .pipe(catchError(err => throwError(() => err)));
  }

  // ─── Service Config ───────────────────────────────────────────────────────

  getServiceConfig(companyId: number, serviceId: number): Observable<IServiceConfig | null> {
    return this.http
      .get<IServiceConfig>(`${this.base}/companies/${companyId}/services/${serviceId}/config`)
      .pipe(catchError(err => throwError(() => err)));
  }
}
