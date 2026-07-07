import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EnvironmentService } from './environment.service';
import { IReleaseNote } from '../interfaces/i-service.interface';
import { SUPPRESS_ERROR_TOAST } from '../interceptors/error.interceptor';

@Injectable({ providedIn: 'root' })
export class ReleaseNotesService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvironmentService);

  getAll(): Observable<IReleaseNote[]> {
    return this.http.get<IReleaseNote[]>(
      `${this.env.apiUrl}/release-notes`,
      { context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true) }
    );
  }
}
