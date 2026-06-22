import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { EnvironmentService } from './environment.service';

export interface ContactConfigAddon {
  addonId: number;
  addonName: string;
  price: number;
}

export interface ContactConfigService {
  serviceId: number;
  serviceName: string;
  price: number;
}

export interface ContactConfig {
  serviceId?: number;
  serviceName?: string;
  packageId?: number;
  packageName?: string;
  basePrice?: number;
  fullTotal?: number;
  discountedTotal?: number;
  discount?: number;
  addons?: ContactConfigAddon[];
  services?: ContactConfigService[];
}

export interface ContactPayload {
  name: string;
  email: string;
  phone: string;
  business: string;
  service: string;
  message: string;
  referral?: string;
  config?: ContactConfig | null;
  source: string;
  timestamp: string;
}

export interface WebhookResponse {
  success?: boolean;
  message?: string;
  emailSent?: boolean;
  requestId?: number;
}

@Injectable({ providedIn: 'root' })
export class WebhookService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvironmentService);

  submitContact(payload: ContactPayload): Observable<WebhookResponse> {
    return this.http.post<WebhookResponse>(`${this.env.apiUrl}/contact-requests`, payload).pipe(
      timeout(15_000),
      catchError((err: HttpErrorResponse) => {
        const message = err.status === 0
          ? 'Network error - please check your connection and try again.'
          : err.status >= 500
            ? 'Server error - please try again in a moment.'
            : 'Submission failed - please try again or email us directly.';
        return throwError(() => new Error(message));
      })
    );
  }
}
