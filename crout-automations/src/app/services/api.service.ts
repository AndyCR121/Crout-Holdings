import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
// The live API returns PascalCase while IService/IAddon/IPackage use a
// mixed camelCase/snake_case convention. These mappers accept EITHER shape
// so nothing breaks whether the server changes casing or the demo data is used.

function normalizeService(raw: any): IService {
  return {
    service_id:         raw.service_id          ?? raw.serviceId          ?? raw.id,
    // ⚠️  Must map to lowercase keys to match IService + buildViews() checks
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
    addon_id:         raw.addon_id         ?? raw.addonId          ?? raw.id,
    service_id:       raw.service_id       ?? raw.serviceId        ?? null,
    addonName:        raw.AddonName        ?? raw.addonName        ?? raw.name        ?? '',
    addonDescription: raw.AddonDescription ?? raw.addonDescription ?? raw.description ?? '',
    price:            raw.Price            ?? raw.price            ?? 0,
  };
}

function normalizePackage(raw: any): IPackage {
  return {
    package_id:            raw.package_id           ?? raw.packageId          ?? raw.id,
    parent_package_id:     raw.parent_package_id    ?? raw.parentPackageId    ?? undefined,
    service_ids:           raw.service_ids          ?? raw.serviceIds         ?? [],
    packageName:           raw.PackageName          ?? raw.packageName        ?? raw.name        ?? '',
    packageDescription:    raw.PackageDescription   ?? raw.packageDescription ?? raw.description ?? '',
    discount:              raw.Discount             ?? raw.discount           ?? 0,
    minimumRequiredAddons: raw.minimumRequiredAddons ?? raw.minimumrequiredaddons ?? undefined,
  };
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly env  = inject(EnvironmentService);
  private get base(): string { return this.env.apiUrl; }

  // ─── Services ────────────────────────────────────────────────────────────

  getServices(): Observable<IService[]> {
    return this.http
      .get<any[]>(`${this.base}/services`)
      .pipe(
        map(arr => arr.map(normalizeService)),
        catchError(err => throwError(() => err))
      );
  }

  getService(id: number): Observable<IService> {
    return this.http
      .get<any>(`${this.base}/services/${id}`)
      .pipe(
        map(normalizeService),
        catchError(err => throwError(() => err))
      );
  }

  // ─── Addons ───────────────────────────────────────────────────────────────

  getAddonsByService(serviceId: number): Observable<IAddon[]> {
    return this.http
      .get<any[]>(`${this.base}/services/${serviceId}/addons`)
      .pipe(
        map(arr => arr.map(normalizeAddon)),
        catchError(err => throwError(() => err))
      );
  }

  // ─── Packages ─────────────────────────────────────────────────────────────

  getAllPackages(): Observable<IPackage[]> {
    return this.http
      .get<any[]>(`${this.base}/services/packages`)
      .pipe(
        map(arr => arr.map(normalizePackage)),
        catchError(err => throwError(() => err))
      );
  }

  getPackagesByService(serviceId: number): Observable<IPackage[]> {
    return this.http
      .get<any[]>(`${this.base}/services/${serviceId}/packages`)
      .pipe(
        map(arr => arr.map(normalizePackage)),
        catchError(err => throwError(() => err))
      );
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
