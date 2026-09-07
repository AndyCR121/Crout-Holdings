import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvironmentService } from './environment.service';
import { CustomFormShareLinkGenerated, CustomFormShareLinkStatus } from '../interfaces/i-custom-form-share-link.interface';

/**
 * Owner-facing, authenticated share-link management calls (generate/revoke/status).
 * Mirrors ServiceTriggerApiService's cookie-based auth header pattern for consistency.
 */
@Injectable({ providedIn: 'root' })
export class CustomFormShareLinkApiService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvironmentService);
  private get base(): string { return this.env.apiUrl; }

  getStatus(companyId: number, userServiceId: number): Observable<CustomFormShareLinkStatus> {
    return this.http.get<CustomFormShareLinkStatus>(
      `${this.base}/companies/${companyId}/services/${userServiceId}/share-link`,
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  generate(companyId: number, userServiceId: number): Observable<CustomFormShareLinkGenerated> {
    return this.http.post<CustomFormShareLinkGenerated>(
      `${this.base}/companies/${companyId}/services/${userServiceId}/share-link/generate`,
      {},
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  revoke(companyId: number, userServiceId: number): Observable<void> {
    return this.http.post<void>(
      `${this.base}/companies/${companyId}/services/${userServiceId}/share-link/revoke`,
      {},
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  private authHeaders(): HttpHeaders {
    const match = document.cookie.match(/(?:^|;\s*)ca_jwt=([^;]*)/);
    const token = match ? decodeURIComponent(match[1]) : '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
