import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { IDevDashboard, IDevPortalService, IPagedResult } from '../interfaces/i-service.interface';
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
}
