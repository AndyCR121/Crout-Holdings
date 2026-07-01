import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { IDevDashboard, IDevPortalService, IPagedResult } from '../interfaces/i-service.interface';
import { DevUserServiceForm } from '../interfaces/i-custom-form-builder.interface';
import { EnvironmentService } from './environment.service';

@Injectable({ providedIn: 'root' })
export class DevService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvironmentService);
  private get base(): string { return `${this.env.apiUrl}/dev`; }

  private authHeaders(): HttpHeaders {
    const token = document.cookie.match(/(?:^|;\s*)ca_jwt=([^;]+)/)?.[1];
    return token ? new HttpHeaders({ Authorization: `Bearer ${decodeURIComponent(token)}` }) : new HttpHeaders();
  }

  getDashboard(): Observable<IDevDashboard> {
    return this.http.get<IDevDashboard>(`${this.base}/dashboard`, { headers: this.authHeaders(), withCredentials: true });
  }

  getAssigned(page = 1, pageSize = 20, search = ''): Observable<IPagedResult<IDevPortalService>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (search.trim()) params = params.set('search', search.trim());
    return this.http.get<IPagedResult<IDevPortalService>>(`${this.base}/services/assigned`, { params, headers: this.authHeaders(), withCredentials: true });
  }

  getAvailable(page = 1, pageSize = 20, search = ''): Observable<IPagedResult<IDevPortalService>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (search.trim()) params = params.set('search', search.trim());
    return this.http.get<IPagedResult<IDevPortalService>>(`${this.base}/services/available`, { params, headers: this.authHeaders(), withCredentials: true });
  }

  claim(userServiceId: number): Observable<{ devServiceId: number }> {
    return this.http.post<{ devServiceId: number }>(`${this.base}/services/${userServiceId}/claim`, {}, { headers: this.authHeaders(), withCredentials: true });
  }

  getGuide(userServiceId: number): Observable<IDevPortalService> {
    return this.http.get<IDevPortalService>(`${this.base}/services/${userServiceId}/guide`, { headers: this.authHeaders(), withCredentials: true });
  }

  updateGuideStep(userServiceId: number, step: number): Observable<IDevPortalService> {
    return this.http.post<IDevPortalService>(`${this.base}/services/${userServiceId}/guide/step`, { step }, { headers: this.authHeaders(), withCredentials: true });
  }

  updateGuideIntegrations(userServiceId: number, payload: {
    trigger: string[];
    action: string[];
    output: string[];
    triggerNotes?: string;
    actionNotes?: string;
    outputNotes?: string;
  }): Observable<IDevPortalService> {
    return this.http.post<IDevPortalService>(`${this.base}/services/${userServiceId}/guide/integrations`, payload, { headers: this.authHeaders(), withCredentials: true });
  }

  updateMaintenance(userServiceId: number, isMaintenance: boolean): Observable<IDevPortalService> {
    return this.http.post<IDevPortalService>(`${this.base}/services/${userServiceId}/maintenance`, { isMaintenance }, { headers: this.authHeaders(), withCredentials: true });
  }

  getForm(userServiceId: number): Observable<DevUserServiceForm> {
    return this.http.get<DevUserServiceForm>(`${this.env.apiUrl}/workflow/user-services/${userServiceId}/custom-form`, { headers: this.authHeaders(), withCredentials: true });
  }

  createForm(userServiceId: number, payload: {
    label: string;
    description?: string;
    productionWebhookUrl?: string | null;
    schema: Record<string, unknown>;
    payloadTemplate?: Record<string, unknown> | null;
    responseMode?: string;
  }): Observable<DevUserServiceForm> {
    return this.http.post<DevUserServiceForm>(`${this.env.apiUrl}/workflow/user-services/${userServiceId}/custom-form`, payload, { headers: this.authHeaders(), withCredentials: true });
  }

  updateForm(userServiceId: number, payload: {
    label: string;
    description?: string;
    productionWebhookUrl?: string | null;
    schema: Record<string, unknown>;
    payloadTemplate?: Record<string, unknown> | null;
    responseMode?: string;
  }): Observable<DevUserServiceForm> {
    return this.http.put<DevUserServiceForm>(`${this.env.apiUrl}/workflow/user-services/${userServiceId}/custom-form`, payload, { headers: this.authHeaders(), withCredentials: true });
  }

  deleteForm(userServiceId: number): Observable<void> {
    return this.http.delete<void>(`${this.env.apiUrl}/workflow/user-services/${userServiceId}/custom-form`, { headers: this.authHeaders(), withCredentials: true });
  }
}
