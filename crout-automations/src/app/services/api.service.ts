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
  IPricingComponent,
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

function normalizePricingComponent(raw: any): IPricingComponent {
  return {
    pricingComponentId: raw.pricingComponentId ?? raw.PricingComponentId ?? raw.id,
    componentKey: raw.componentKey ?? raw.ComponentKey ?? '',
    componentName: raw.componentName ?? raw.ComponentName ?? '',
    category: raw.category ?? raw.Category ?? '',
    pricingType: raw.pricingType ?? raw.PricingType ?? 'fixed',
    amount: raw.amount ?? raw.Amount ?? 0,
    isRequiredDefault: raw.isRequiredDefault ?? raw.IsRequiredDefault ?? false,
    isActive: raw.isActive ?? raw.IsActive ?? true,
  };
}

function normalizeUserService(raw: any): IUserService {
  return {
    userServiceId: raw.userServiceId ?? raw.UserServiceId ?? raw.id ?? raw.Id,
    companyId: raw.companyId ?? raw.CompanyId,
    serviceId: raw.serviceId ?? raw.ServiceId,
    packageId: raw.packageId ?? raw.PackageId,
    addonIds: raw.addonIds ?? raw.AddonIds ?? [],
    active: raw.active ?? raw.Active ?? true,
    service: raw.service,
    addons: raw.addons,
    config: raw.config ?? raw.Config ?? '',
    status: raw.status ?? raw.Status ?? 0,
    subscriptionId: raw.subscriptionId ?? raw.SubscriptionId,
    subscriptionAmount: raw.subscriptionAmount ?? raw.SubscriptionAmount,
    pricingSnapshot: raw.pricingSnapshot ?? raw.PricingSnapshot,
    paymentDate: raw.paymentDate ?? raw.PaymentDate,
    dueDate: raw.dueDate ?? raw.DueDate,
    createdAt: raw.createdAt ?? raw.CreatedAt,
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

  getRequiredPricingComponents(): Observable<IPricingComponent[]> {
    return this.http
      .get<any[]>(`${this.base}/services/pricing-components/required`, { headers: this.authHeaders(), withCredentials: true })
      .pipe(
        map(arr => arr.map(normalizePricingComponent)),
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
      .get<any[]>(`${this.base}/companies/${companyId}/services`, { headers: this.authHeaders(), withCredentials: true })
      .pipe(
        map(arr => arr.map(normalizeUserService)),
        catchError(err => throwError(() => err))
      );
  }

  // ─── Service Config ───────────────────────────────────────────────────────

  getServiceConfig(companyId: number, serviceId: number): Observable<IServiceConfig | null> {
    return this.http
      .get<IServiceConfig>(`${this.base}/companies/${companyId}/services/${serviceId}/config`, { headers: this.authHeaders(), withCredentials: true })
      .pipe(catchError(err => throwError(() => err)));
  }

  createUserServiceFromConfig(payload: {
    companyId: number;
    serviceId: number;
    packageId?: number | null;
    addonIds?: number[];
    referral?: string;
    requestNote?: string;
  }): Observable<IUserService> {
    return this.http
      .post<any>(`${this.base}/services/user-services`, payload, { headers: this.authHeaders(), withCredentials: true })
      .pipe(
        map(normalizeUserService),
        catchError(err => throwError(() => err))
      );
  }

  requestServiceConfigChange(userServiceId: number, payload: {
    addonIds: number[];
    trigger: string[];
    action: string[];
    output: string[];
    triggerNotes?: string;
    actionNotes?: string;
    outputNotes?: string;
  }): Observable<IUserService> {
    return this.http
      .put<any>(`${this.base}/services/user-services/${userServiceId}/config-request`, payload, { headers: this.authHeaders(), withCredentials: true })
      .pipe(
        map(normalizeUserService),
        catchError(err => throwError(() => err))
      );
  }
}
