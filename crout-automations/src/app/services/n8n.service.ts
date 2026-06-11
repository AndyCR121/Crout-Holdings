import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface IN8nExecution {
  id:         string;
  workflowId: string;
  startedAt:  string;   // ISO date string
  stoppedAt:  string;
  status:     'success' | 'error' | 'running';
}

export interface IDailyRun {
  date:    string; // 'YYYY-MM-DD'
  success: number;
  error:   number;
}

function getApiUrl(): string {
  return (window as any).__env?.apiUrl ?? '';
}

@Injectable({ providedIn: 'root' })
export class N8nService {
  private readonly http = inject(HttpClient);
  private get base(): string { return getApiUrl(); }

  /** Fetch raw executions for a workflow from our backend proxy. */
  getExecutions(workflowId: string, limit = 100): Observable<IN8nExecution[]> {
    return this.http
      .get<IN8nExecution[]>(`${this.base}/n8n/executions/${workflowId}?limit=${limit}`, { withCredentials: true })
      .pipe(catchError(() => of(this._demoExecutions(workflowId))));
  }

  /** Aggregate executions into daily run counts for charting. */
  getDailyRuns(workflowId: string, days = 14): Observable<IDailyRun[]> {
    return this.http
      .get<IDailyRun[]>(`${this.base}/n8n/daily-runs/${workflowId}?days=${days}`, { withCredentials: true })
      .pipe(catchError(() => of(this._demoDailyRuns(days))));
  }

  // ── Demo fallbacks ─────────────────────────────────────────────────────────
  private _demoExecutions(workflowId: string): IN8nExecution[] {
    return Array.from({ length: 20 }, (_, i) => ({
      id:         `demo-${i}`,
      workflowId,
      startedAt:  new Date(Date.now() - i * 4 * 3_600_000).toISOString(),
      stoppedAt:  new Date(Date.now() - i * 4 * 3_600_000 + 45_000).toISOString(),
      status:     (i % 7 === 0 ? 'error' : 'success') as IN8nExecution['status'],
    }));
  }

  private _demoDailyRuns(days: number): IDailyRun[] {
    return Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().slice(0, 10);
      const success = Math.floor(Math.random() * 18) + 2;
      const error   = Math.floor(Math.random() * 3);
      return { date: dateStr, success, error };
    });
  }
}
