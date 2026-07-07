import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { IIntegrationDefinition } from '../interfaces/i-integration-definition.interface';
import { EnvironmentService } from './environment.service';

@Injectable({ providedIn: 'root' })
export class IntegrationDefinitionApiService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvironmentService);
  private get base(): string { return this.env.apiUrl; }

  private authHeaders(): HttpHeaders {
    const match = document.cookie.match(/(?:^|;\s*)ca_jwt=([^;]*)/);
    const token = match ? decodeURIComponent(match[1]) : '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getAdminIntegrationDefinitions(activeOnly = false): Observable<IIntegrationDefinition[]> {
    return this.http.get<IIntegrationDefinition[]>(
      `${this.base}/admin/integration-definitions?activeOnly=${activeOnly}`,
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  createAdminIntegrationDefinition(payload: Partial<IIntegrationDefinition>): Observable<IIntegrationDefinition> {
    return this.http.post<IIntegrationDefinition>(
      `${this.base}/admin/integration-definitions`,
      payload,
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  updateAdminIntegrationDefinition(id: number, payload: Partial<IIntegrationDefinition>): Observable<IIntegrationDefinition> {
    return this.http.put<IIntegrationDefinition>(
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
