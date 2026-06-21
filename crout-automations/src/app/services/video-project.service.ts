import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvironmentService } from './environment.service';
import { RenderVideoProjectResponse, VideoProject, VideoTimeline } from '../interfaces/i-video-project.interface';

@Injectable({ providedIn: 'root' })
export class VideoProjectService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvironmentService);
  private get base(): string { return this.env.apiUrl; }

  list(companyId?: number): Observable<VideoProject[]> {
    const qs = companyId ? `?companyId=${companyId}` : '';
    return this.http.get<VideoProject[]>(`${this.base}/video-projects${qs}`, {
      headers: this.authHeaders(),
      withCredentials: true
    });
  }

  get(projectId: number): Observable<VideoProject> {
    return this.http.get<VideoProject>(`${this.base}/video-projects/${projectId}`, {
      headers: this.authHeaders(),
      withCredentials: true
    });
  }

  saveTimeline(project: VideoProject, timeline: VideoTimeline): Observable<VideoProject> {
    return this.http.put<VideoProject>(
      `${this.base}/video-projects/${project.id}/timeline`,
      { timeline, expectedVersion: project.timelineVersion },
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  render(projectId: number, notes = ''): Observable<RenderVideoProjectResponse> {
    return this.http.post<RenderVideoProjectResponse>(
      `${this.base}/video-projects/${projectId}/render`,
      { notes },
      { headers: this.authHeaders(), withCredentials: true }
    );
  }

  private authHeaders(): HttpHeaders {
    const match = document.cookie.match(/(?:^|;\s*)ca_jwt=([^;]*)/);
    const token = match ? decodeURIComponent(match[1]) : '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
