import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvironmentService } from './environment.service';
import { PublicCustomFormResolved } from '../interfaces/i-custom-form-share-link.interface';
import { ExecuteTriggerResponse } from '../interfaces/i-service-trigger.interface';

/**
 * Calls to the unauthenticated public share-link surface. Deliberately does not send
 * cookies or an Authorization header — the token in the URL is the only credential, and
 * this endpoint must never be reachable via, or mistaken for, the authenticated session.
 */
@Injectable({ providedIn: 'root' })
export class PublicFormApiService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvironmentService);
  private get base(): string { return this.env.apiUrl; }

  resolve(token: string): Observable<PublicCustomFormResolved> {
    return this.http.get<PublicCustomFormResolved>(`${this.base}/public/forms/${encodeURIComponent(token)}`);
  }

  submit(token: string, payload: Record<string, unknown>): Observable<ExecuteTriggerResponse> {
    // PublicFormsController.Submit binds the ENTIRE request body as the field payload
    // (unlike the authenticated execute call, which extracts a nested `payload` property) —
    // so the field map goes straight in the body, and the response is consumed directly as
    // the same ExecuteTriggerResponseDto shape (executionId/status/mode/message/response)
    // the authenticated execute call returns.
    return this.http.post<ExecuteTriggerResponse>(
      `${this.base}/public/forms/${encodeURIComponent(token)}/submit`,
      payload
    );
  }
}
