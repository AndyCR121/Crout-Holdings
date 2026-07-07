import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EnvironmentService } from './environment.service';
import {
  IUser,
  ICompany,
  IService,
  IAddon,
  IServiceFeature,
  IPackage,
  ICreateDevServiceAssignment,
  IDevServiceAssignment,
  IUpdateDevServiceAssignment,
  IAdminClientService,
  IAdminClientServiceUpsert,
  IAdminPaystackMapping,
  IDatabaseManagementTarget,
  IDatabaseMigrationOperation,
  IDatabaseMigrationValidation,
  IMigrationSelection,
  ISchemaComparisonResponse,
  ISchemaSyncPlan,
  ISqlUpdatePreview,
  ISqlUpdaterSummary,
} from '../interfaces/i-service.interface';

function normalizeService(raw: any): IService {
  const baseCost = raw.baseCost ?? raw.BaseCost ?? raw.price ?? raw.Price ?? 0;
  const tokensCost = raw.tokensCost ?? raw.TokensCost ?? 0;
  return {
    serviceId: raw.serviceId ?? raw.ServiceId ?? raw.id ?? 0,
    serviceName: raw.serviceName ?? raw.ServiceName ?? raw.name ?? '',
    baseCost,
    tokensCost,
    totalTokens: raw.totalTokens ?? raw.TotalTokens ?? 0,
    price: raw.price ?? raw.Price ?? (baseCost + tokensCost),
    hasAddons: raw.hasAddons ?? raw.HasAddons ?? false,
    conditional: raw.conditional ?? raw.Conditional ?? false,
    serviceDescription: raw.serviceDescription ?? raw.ServiceDescription ?? raw.description ?? '',
    features: raw.features ?? [],
    addons: Array.isArray(raw.addons) ? raw.addons.map(normalizeAddon) : [],
  };
}

function normalizeAddon(raw: any): IAddon {
  const serviceIds = raw.serviceIds ?? raw.ServiceIds ?? (raw.serviceId != null ? [raw.serviceId] : []);
  const monthlyPrice = raw.monthlyPrice ?? raw.MonthlyPrice ?? raw.price ?? raw.Price ?? 0;
  return {
    addonId: raw.addonId ?? raw.AddonId ?? raw.id ?? 0,
    serviceId: raw.serviceId ?? raw.ServiceId ?? serviceIds[0] ?? null,
    serviceIds,
    addonName: raw.addonName ?? raw.AddonName ?? raw.name ?? '',
    addonDescription: raw.addonDescription ?? raw.AddonDescription ?? raw.description ?? '',
    type: raw.type ?? raw.Type ?? 'Action',
    monthlyPrice,
    price: raw.price ?? raw.Price ?? monthlyPrice,
    isActive: raw.isActive ?? raw.IsActive ?? true,
    displayOrder: raw.displayOrder ?? raw.DisplayOrder ?? 0,
    integrations: Array.isArray(raw.integrations) ? raw.integrations : [],
  };
}

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
  getUsers(page = 1, pageSize = 20, search = '', isDev?: boolean): Observable<PagedResult<IUser>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize).set('search', search);
    const finalParams = isDev == null ? params : params.set('isDev', isDev);
    return this.http.get<PagedResult<IUser>>(`${this.base}/users`, { params: finalParams, headers: this.authHeaders(), withCredentials: true });
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
      .pipe(map(r => r.items.map(normalizeService)));
  }
  getServicesPaged(page = 1, pageSize = 20): Observable<PagedResult<IService>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedResult<any>>(`${this.base}/services`, { params, headers: this.authHeaders(), withCredentials: true })
      .pipe(map(r => ({ ...r, items: r.items.map(normalizeService) })));
  }
  createService(body: Partial<IService>): Observable<IService> {
    return this.http.post<any>(`${this.base}/services`, body, { headers: this.authHeaders(), withCredentials: true }).pipe(map(normalizeService));
  }
  updateService(id: number, body: Partial<IService>): Observable<IService> {
    return this.http.put<any>(`${this.base}/services/${id}`, body, { headers: this.authHeaders(), withCredentials: true }).pipe(map(normalizeService));
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
    return this.http.get<PagedResult<any>>(`${this.base}/addons`, { params, headers: this.authHeaders(), withCredentials: true })
      .pipe(map(r => ({ ...r, items: r.items.map(normalizeAddon) })));
  }
  getAddon(id: number): Observable<IAddon> {
    return this.http.get<any>(`${this.base}/addons/${id}`, { headers: this.authHeaders(), withCredentials: true }).pipe(map(normalizeAddon));
  }
  createAddon(dto: Partial<IAddon> & { integrationIds?: number[] }): Observable<IAddon> {
    return this.http.post<any>(`${this.base}/addons`, dto, { headers: this.authHeaders(), withCredentials: true }).pipe(map(normalizeAddon));
  }
  updateAddon(id: number, dto: Partial<IAddon> & { integrationIds?: number[] }): Observable<IAddon> {
    return this.http.put<any>(`${this.base}/addons/${id}`, dto, { headers: this.authHeaders(), withCredentials: true }).pipe(map(normalizeAddon));
  }
  deleteAddon(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/addons/${id}`, { headers: this.authHeaders(), withCredentials: true });
  }

  linkServicesToAddon(addonId: number, serviceIds: number[]): Observable<{ addonId: number; serviceIds: number[] }> {
    return this.http.put<{ addonId: number; serviceIds: number[] }>(`${this.base}/addons/${addonId}/services`, { serviceIds }, { headers: this.authHeaders(), withCredentials: true });
  }

  linkIntegrationsToAddon(addonId: number, integrationIds: number[]): Observable<{ addonId: number; integrationIds: number[] }> {
    return this.http.put<{ addonId: number; integrationIds: number[] }>(`${this.base}/addons/${addonId}/integrations`, { integrationIds }, { headers: this.authHeaders(), withCredentials: true });
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

  // Dev Management
  getDevUsers(page = 1, pageSize = 100, search = ''): Observable<PagedResult<IUser>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize).set('search', search);
    return this.http.get<PagedResult<IUser>>(`${this.base}/dev-users`, { params, headers: this.authHeaders(), withCredentials: true });
  }

  getDevServices(
    page = 1,
    pageSize = 20,
    filters: {
      search?: string;
      developerId?: number;
      companyId?: number;
      serviceId?: number;
      referral?: string;
      assigned?: boolean;
      active?: boolean;
    } = {},
  ): Observable<PagedResult<IDevServiceAssignment>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<PagedResult<IDevServiceAssignment>>(`${this.base}/dev-services`, { params, headers: this.authHeaders(), withCredentials: true });
  }

  createDevService(dto: ICreateDevServiceAssignment): Observable<IDevServiceAssignment> {
    return this.http.post<IDevServiceAssignment>(`${this.base}/dev-services`, dto, { headers: this.authHeaders(), withCredentials: true });
  }

  updateDevService(id: number, dto: IUpdateDevServiceAssignment): Observable<IDevServiceAssignment> {
    return this.http.put<IDevServiceAssignment>(`${this.base}/dev-services/${id}`, dto, { headers: this.authHeaders(), withCredentials: true });
  }

  deleteDevService(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/dev-services/${id}`, { headers: this.authHeaders(), withCredentials: true });
  }

  // Client Service Management
  getClientServices(
    page = 1,
    pageSize = 20,
    filters: { search?: string; userId?: number; companyId?: number; serviceId?: number; active?: boolean } = {},
  ): Observable<PagedResult<IAdminClientService>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<PagedResult<IAdminClientService>>(`${this.base}/client-services`, { params, headers: this.authHeaders(), withCredentials: true });
  }

  createClientService(dto: IAdminClientServiceUpsert): Observable<IAdminClientService> {
    return this.http.post<IAdminClientService>(`${this.base}/client-services`, dto, { headers: this.authHeaders(), withCredentials: true });
  }

  updateClientService(id: number, dto: Partial<IAdminClientServiceUpsert>): Observable<IAdminClientService> {
    return this.http.put<IAdminClientService>(`${this.base}/client-services/${id}`, dto, { headers: this.authHeaders(), withCredentials: true });
  }

  deleteClientService(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/client-services/${id}`, { headers: this.authHeaders(), withCredentials: true });
  }

  pauseClientServiceIntegration(id: number): Observable<IAdminClientService> {
    return this.http.post<IAdminClientService>(`${this.base}/client-services/${id}/integration/pause`, {}, { headers: this.authHeaders(), withCredentials: true });
  }

  startClientServiceIntegration(id: number): Observable<IAdminClientService> {
    return this.http.post<IAdminClientService>(`${this.base}/client-services/${id}/integration/start`, {}, { headers: this.authHeaders(), withCredentials: true });
  }

  getDatabaseManagementTargets(): Observable<IDatabaseManagementTarget[]> {
    return this.http.get<IDatabaseManagementTarget[]>(
      `${this.base}/database-management/targets`,
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  getSqlUpdatePreview(targetKey: string): Observable<ISqlUpdatePreview> {
    const params = new HttpParams().set('targetKey', targetKey);
    return this.http.get<ISqlUpdatePreview>(
      `${this.base}/database-management/sql-updates/preview`,
      { params, headers: this.authHeaders(), withCredentials: true }
    );
  }

  getLatestSqlUpdateResult(targetKey: string): Observable<ISqlUpdaterSummary> {
    const params = new HttpParams().set('targetKey', targetKey);
    return this.http.get<ISqlUpdaterSummary>(
      `${this.base}/database-management/sql-updates/latest`,
      { params, headers: this.authHeaders(), withCredentials: true }
    );
  }

  runSqlUpdate(targetKey: string, confirmationText: string): Observable<ISqlUpdaterSummary> {
    return this.http.post<ISqlUpdaterSummary>(
      `${this.base}/database-management/run-migrations`,
      { targetKey, confirmExecution: true, confirmationText },
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  compareSchema(source: IMigrationSelection, target: IMigrationSelection): Observable<ISchemaComparisonResponse> {
    return this.http.post<ISchemaComparisonResponse>(
      `${this.base}/database-management/schema-compare`,
      { source, target },
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  createSchemaSyncPlan(source: IMigrationSelection, target: IMigrationSelection): Observable<ISchemaSyncPlan> {
    return this.http.post<ISchemaSyncPlan>(
      `${this.base}/database-management/schema-sync-plan`,
      { source, target },
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  generateSchemaSyncMigration(
    source: IMigrationSelection,
    target: IMigrationSelection,
    confirmationText: string,
  ): Observable<ISchemaSyncPlan> {
    return this.http.post<ISchemaSyncPlan>(
      `${this.base}/database-management/schema-sync-plan/generate-migration`,
      { source, target, confirmGeneration: true, confirmationText },
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  getSchemaSyncMigrationDownloadUrl(fileName: string): string {
    const params = new HttpParams().set('fileName', fileName);
    return `${this.base}/database-management/schema-sync-plan/download?${params.toString()}`;
  }

  validateDatabaseMigration(source: IMigrationSelection, destination: IMigrationSelection): Observable<IDatabaseMigrationValidation> {
    return this.http.post<IDatabaseMigrationValidation>(
      `${this.base}/database-management/migrations/validate`,
      { source, destination },
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  startDatabaseMigration(
    source: IMigrationSelection,
    destination: IMigrationSelection,
    sourceConfirmationText: string,
    destinationConfirmationText: string,
  ): Observable<IDatabaseMigrationOperation> {
    return this.http.post<IDatabaseMigrationOperation>(
      `${this.base}/database-management/migrations/start`,
      {
        source,
        destination,
        confirmExecution: true,
        acknowledgeDestinationChange: true,
        sourceConfirmationText,
        destinationConfirmationText,
      },
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  getDatabaseMigrationStatus(operationId: string): Observable<IDatabaseMigrationOperation> {
    return this.http.get<IDatabaseMigrationOperation>(
      `${this.base}/database-management/migrations/status/${operationId}`,
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  // Paystack Subscription Mapping
  getPaystackMappings(
    page = 1,
    pageSize = 20,
    filters: { search?: string; mappingStatus?: string } = {},
  ): Observable<PagedResult<IAdminPaystackMapping>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<PagedResult<IAdminPaystackMapping>>(`${this.base}/paystack-mappings`, { params, headers: this.authHeaders(), withCredentials: true });
  }

  updatePaystackMapping(userServiceId: number, dto: {
    subscriptionId?: string | null;
    status: number;
    paymentDate?: string | null;
    dueDate?: string | null;
  }): Observable<IAdminClientService> {
    return this.http.put<IAdminClientService>(`${this.base}/paystack-mappings/${userServiceId}`, dto, { headers: this.authHeaders(), withCredentials: true });
  }

  clearPaystackMapping(userServiceId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/paystack-mappings/${userServiceId}`, { headers: this.authHeaders(), withCredentials: true });
  }
}
