import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvironmentService } from './environment.service';
import { IServiceWorkflowCapability, IWorkflowIntegrationDefinition, IUserServiceWorkflowStep } from '../interfaces/i-workflow-capability.interface';
import { DevUserServiceForm } from '../interfaces/i-custom-form-builder.interface';

@Injectable({ providedIn: 'root' })
export class WorkflowCapabilityApiService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvironmentService);
  private get base(): string { return this.env.apiUrl; }

  private authHeaders(): HttpHeaders {
    const match = document.cookie.match(/(?:^|;\s*)ca_jwt=([^;]*)/);
    const token = match ? decodeURIComponent(match[1]) : '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getServiceCapabilities(serviceId: number, activeOnly = true): Observable<IServiceWorkflowCapability[]> {
    return this.http.get<IServiceWorkflowCapability[]>(
      `${this.base}/workflow/services/${serviceId}/capabilities?activeOnly=${activeOnly}`,
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  getWorkflowSteps(userServiceId: number): Observable<IUserServiceWorkflowStep[]> {
    return this.http.get<IUserServiceWorkflowStep[]>(
      `${this.base}/workflow/user-services/${userServiceId}/steps`,
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  saveRequestedSelection(userServiceId: number, capabilityIds: number[]): Observable<IUserServiceWorkflowStep[]> {
    return this.http.put<IUserServiceWorkflowStep[]>(
      `${this.base}/workflow/user-services/${userServiceId}/selection`,
      { capabilityIds },
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  confirmSelection(userServiceId: number, capabilityIds: number[]): Observable<IUserServiceWorkflowStep[]> {
    return this.http.post<IUserServiceWorkflowStep[]>(
      `${this.base}/workflow/user-services/${userServiceId}/confirm`,
      { capabilityIds },
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  updateStepCredentials(userServiceId: number, stepId: number, values: Record<string, string>): Observable<IUserServiceWorkflowStep> {
    return this.http.put<IUserServiceWorkflowStep>(
      `${this.base}/workflow/user-services/${userServiceId}/steps/${stepId}/credentials`,
      { values },
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  getCustomForm(userServiceId: number): Observable<DevUserServiceForm> {
    return this.http.get<DevUserServiceForm>(
      `${this.base}/workflow/user-services/${userServiceId}/custom-form`,
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  createCustomForm(userServiceId: number, payload: unknown): Observable<DevUserServiceForm> {
    return this.http.post<DevUserServiceForm>(
      `${this.base}/workflow/user-services/${userServiceId}/custom-form`,
      payload,
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  updateCustomForm(userServiceId: number, payload: unknown): Observable<DevUserServiceForm> {
    return this.http.put<DevUserServiceForm>(
      `${this.base}/workflow/user-services/${userServiceId}/custom-form`,
      payload,
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  deleteCustomForm(userServiceId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/workflow/user-services/${userServiceId}/custom-form`,
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  getAdminServiceCapabilities(serviceId: number, activeOnly = false): Observable<IServiceWorkflowCapability[]> {
    return this.http.get<IServiceWorkflowCapability[]>(
      `${this.base}/admin/services/${serviceId}/workflow-capabilities?activeOnly=${activeOnly}`,
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  createAdminServiceCapability(serviceId: number, payload: Partial<IServiceWorkflowCapability>): Observable<IServiceWorkflowCapability> {
    return this.http.post<IServiceWorkflowCapability>(
      `${this.base}/admin/services/${serviceId}/workflow-capabilities`,
      payload,
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  updateAdminServiceCapability(capabilityId: number, payload: Partial<IServiceWorkflowCapability>): Observable<IServiceWorkflowCapability> {
    return this.http.put<IServiceWorkflowCapability>(
      `${this.base}/admin/workflow-capabilities/${capabilityId}`,
      payload,
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  deleteAdminServiceCapability(capabilityId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/admin/workflow-capabilities/${capabilityId}`,
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  getAdminIntegrationDefinitions(activeOnly = false): Observable<IWorkflowIntegrationDefinition[]> {
    return this.http.get<IWorkflowIntegrationDefinition[]>(
      `${this.base}/admin/integration-definitions?activeOnly=${activeOnly}`,
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  createAdminIntegrationDefinition(payload: Partial<IWorkflowIntegrationDefinition>): Observable<IWorkflowIntegrationDefinition> {
    return this.http.post<IWorkflowIntegrationDefinition>(
      `${this.base}/admin/integration-definitions`,
      payload,
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  updateAdminIntegrationDefinition(id: number, payload: Partial<IWorkflowIntegrationDefinition>): Observable<IWorkflowIntegrationDefinition> {
    return this.http.put<IWorkflowIntegrationDefinition>(
      `${this.base}/admin/integration-definitions/${id}`,
      payload,
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  deleteAdminIntegrationDefinition(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/admin/integration-definitions/${id}`,
      { headers: this.authHeaders(), withCredentials: true }
    );
  }
}
