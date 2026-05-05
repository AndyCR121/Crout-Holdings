import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

export interface ContactPayload {
  name: string;
  email: string;
  phone: string;
  business: string;
  service: string;
  message: string;
  source: string;
  timestamp: string;
}

export interface WebhookResponse {
  success: boolean;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class WebhookService {
  private readonly http = inject(HttpClient);

  /**
   * Replace this URL with your live n8n webhook URL.
   * In n8n: create a Webhook node → set Method to POST → copy the Production URL here.
   * The workflow receives the payload and can route to email, Notion, WhatsApp, CRM, etc.
   */
  private readonly WEBHOOK_URL = 'https://your-n8n-instance.com/webhook/crout-contact';

  submitContact(payload: ContactPayload): Observable<WebhookResponse> {
    return this.http.post<WebhookResponse>(this.WEBHOOK_URL, payload).pipe(
      timeout(15_000),
      catchError((err: HttpErrorResponse) => {
        const message = err.status === 0
          ? 'Network error — please check your connection and try again.'
          : err.status >= 500
            ? 'Server error — please try again in a moment.'
            : 'Submission failed — please try again or email us directly.';
        return throwError(() => new Error(message));
      })
    );
  }
}
