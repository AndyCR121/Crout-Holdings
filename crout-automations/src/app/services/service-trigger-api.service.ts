import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvironmentService } from './environment.service';
import { ExecuteTriggerResponse, ServiceTriggerConfig } from '../interfaces/i-service-trigger.interface';

@Injectable({ providedIn: 'root' })
export class ServiceTriggerApiService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvironmentService);
  private get base(): string { return this.env.apiUrl; }

  getConfigs(companyId: number, serviceId: number): Observable<ServiceTriggerConfig[]> {
    return this.http.get<ServiceTriggerConfig[]>(
      `${this.base}/companies/${companyId}/services/${serviceId}/triggers`,
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  execute(
    triggerId: number,
    companyId: number,
    userServiceId: number | null,
    payload: Record<string, unknown>,
    files: File[] = []
  ): Observable<ExecuteTriggerResponse> {
    if (files.length) {
      const form = new FormData();
      form.set('companyId', String(companyId));
      if (userServiceId != null) form.set('userServiceId', String(userServiceId));
      form.set('payload', JSON.stringify(payload));
      files.forEach(file => form.append('files', file, file.name));
      return this.http.post<ExecuteTriggerResponse>(
        `${this.base}/service-triggers/${triggerId}/execute`,
        form,
        { headers: this.authHeaders(), withCredentials: true }
      );
    }

    return this.http.post<ExecuteTriggerResponse>(
      `${this.base}/service-triggers/${triggerId}/execute`,
      { companyId, userServiceId, payload },
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  private authHeaders(): HttpHeaders {
    const match = document.cookie.match(/(?:^|;\s*)ca_jwt=([^;]*)/);
    const token = match ? decodeURIComponent(match[1]) : '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
