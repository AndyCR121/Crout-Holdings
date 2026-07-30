import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface IN8nExecution {
  id:         string;
  workflowId: string;
  startedAt:  string;
  stoppedAt:  string;
  status:     'success' | 'error' | 'running';
}

export interface IDailyRun {
  date:    string; // 'YYYY-MM-DD'
  success: number;
  error:   number;
}

@Injectable({ providedIn: 'root' })
export class N8nService {
  getExecutions(workflowId: string, limit = 100): Observable<IN8nExecution[]> {
    return of(this._demoExecutions(workflowId).slice(0, limit));
  }

  getDailyRuns(workflowId: string, days = 14): Observable<IDailyRun[]> {
    return of(this._demoDailyRuns(days));
  }

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
      return {
        date:    d.toISOString().slice(0, 10),
        success: Math.floor(Math.random() * 18) + 2,
        error:   Math.floor(Math.random() * 3),
      };
    });
  }
}
