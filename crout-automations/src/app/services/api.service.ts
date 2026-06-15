import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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

// ─── Field-name normalizers ───────────────────────────────────────────────────

function normalizeService(raw: any): IService {
  return {
    serviceId:         raw.serviceId          ?? raw.id,
    serviceName:        raw.ServiceName         ?? raw.serviceName        ?? raw.name        ?? '',
    price:              raw.Price               ?? raw.price              ?? 0,
    hasAddons:          raw.HasAddons           ?? raw.hasAddons          ?? false,
    serviceDescription: raw.ServiceDescription  ?? raw.serviceDescription ?? raw.description ?? '',
    conditional:        raw.Conditional         ?? raw.conditional        ?? false,
    features:           raw.features            ?? [],
  };
}

function normalizeAddon(raw: any): IAddon {
  return {
    addonId:          raw.addonId          ?? raw.id,
    serviceId:        raw.serviceId        ?? null,
    addonName:        raw.AddonName        ?? raw.addonName        ?? raw.name        ?? '',
    addonDescription: raw.AddonDescription ?? raw.addonDescription ?? raw.description ?? '',
    price:            raw.Price            ?? raw.price            ?? 0,
  };
}

function normalizePackage(raw: any): IPackage {
  return {
    packageId:            raw.packageId           ?? raw.id,
    parentPackageId:      raw.parentPackageId      ?? undefined,
    serviceIds:           raw.serviceIds           ?? raw.service_ids ?? [],
    packageName:          raw.PackageName          ?? raw.packageName        ?? raw.name        ?? '',
    packageDescription:   raw.PackageDescription   ?? raw.packageDescription ?? raw.description ?? '',
    discount:             raw.Discount             ?? raw.discount           ?? 0,
    minimumRequiredAddons: raw.minimumRequiredAddons ?? raw.minimumrequiredaddons ?? undefined,
  };
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly env  = inject(EnvironmentService);
  private get base(): string { return this.env.apiUrl; }

  /** Read ca_jwt cookie and return Authorization headers. */
  private authHeaders(): HttpHeaders {
    const match = document.cookie.match(/(?:^|;\s*)ca_jwt=([^;]*)/);
    const token = match ? decodeURIComponent(match[1]) : '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ─── Services ────────────────────────────────────────────────────────────

  getServices(): Observable<IService[]> {
    return this.http
      .get<any[]>(`${this.base}/services`, { headers: this.authHeaders(), withCredentials: true })
      .pipe(
        map(arr => arr.map(normalizeService)),
        catchError(err => throwError(() => err))
      );
  }

  getService(id: number): Observable<IService> {
    return this.http
      .get<any>(`${this.base}/services/${id}`, { headers: this.authHeaders(), withCredentials: true })
      .pipe(
        map(normalizeService),
        catchError(err => throwError(() => err))
      );
  }

  // ─── Addons ───────────────────────────────────────────────────────────────

  getAddonsByService(serviceId: number): Observable<IAddon[]> {
    return this.http
      .get<any[]>(`${this.base}/services/${serviceId}/addons`, { headers: this.authHeaders(), withCredentials: true })
      .pipe(
        map(arr => arr.map(normalizeAddon)),
        catchError(err => throwError(() => err))
      );
  }

  // ─── Packages ─────────────────────────────────────────────────────────────

  getAllPackages(): Observable<IPackage[]> {
    return this.http
      .get<any[]>(`${this.base}/services/packages`, { headers: this.authHeaders(), withCredentials: true })
      .pipe(
        map(arr => arr.map(normalizePackage)),
        catchError(err => throwError(() => err))
      );
  }

  getPackagesByService(serviceId: number): Observable<IPackage[]> {
    return this.http
      .get<any[]>(`${this.base}/services/${serviceId}/packages`, { headers: this.authHeaders(), withCredentials: true })
      .pipe(
        map(arr => arr.map(normalizePackage)),
        catchError(err => throwError(() => err))
      );
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  getUser(id: number): Observable<IUser> {
    return this.http
      .get<IUser>(`${this.base}/users/${id}`, { headers: this.authHeaders(), withCredentials: true })
      .pipe(catchError(err => throwError(() => err)));
  }

  // ─── Companies ────────────────────────────────────────────────────────────

  getCompaniesByUser(userId: number): Observable<ICompany[]> {
    return this.http
      .get<ICompany[]>(`${this.base}/users/${userId}/companies`, { headers: this.authHeaders(), withCredentials: true })
      .pipe(catchError(err => throwError(() => err)));
  }

  getCompany(companyId: number): Observable<ICompany> {
    return this.http
      .get<ICompany>(`${this.base}/companies/${companyId}`, { headers: this.authHeaders(), withCredentials: true })
      .pipe(catchError(err => throwError(() => err)));
  }

  // ─── Company Services ─────────────────────────────────────────────────────

  getCompanyServices(companyId: number): Observable<IUserService[]> {
    return this.http
      .get<IUserService[]>(`${this.base}/companies/${companyId}/services`, { headers: this.authHeaders(), withCredentials: true })
      .pipe(catchError(err => throwError(() => err)));
  }

  // ─── Service Config ───────────────────────────────────────────────────────

  getServiceConfig(companyId: number, serviceId: number): Observable<IServiceConfig | null> {
    return this.http
      .get<IServiceConfig>(`${this.base}/companies/${companyId}/services/${serviceId}/config`, { headers: this.authHeaders(), withCredentials: true })
      .pipe(catchError(err => throwError(() => err)));
  }
}
