import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { EnvironmentService } from './environment.service';

export interface IPaystackCard {
  authorization_code: string;
  card_type:          string;
  last4:              string;
  exp_month:          string;
  exp_year:           string;
  channel:            string;
  reusable:           boolean;
  bank:               string;
}

export interface IPaystackPlan {
  name:     string;
  interval: string;
  amount:   number;
}

export interface IPaystackSubscription {
  subscription_code:  string;
  status:             string;
  amount:             number;
  next_payment_date:  string | null;
  plan:               IPaystackPlan | null;
  createdAt:          string;
  linked:             boolean;
  userServiceId:      number | null;
  serviceId:          number | null;
  serviceName:        string | null;
  serviceStatus:      number | null;
}

export interface ICompanySubscriptions {
  companyId:     number;
  companyName:   string;
  email:         string;
  subscriptions: IPaystackSubscription[];
}

export interface ICompanyBilling {
  companyId:   number;
  companyName: string;
  email:       string;
  hasEmail:    boolean;
  cards:       IPaystackCard[];
}

export interface ICardCaptureResult {
  access_code:       string;
  reference:         string;
  authorization_url: string;
  email:             string;
  companyName:       string;
}

@Injectable({ providedIn: 'root' })
export class PaystackService {
  private readonly http = inject(HttpClient);
  private readonly env  = inject(EnvironmentService);
  private get base() { return this.env.apiUrl; }

  private authHeaders(): HttpHeaders {
    const match = document.cookie.match(/(?:^|;\s*)ca_jwt=([^;]*)/);
    const token = match ? decodeURIComponent(match[1]) : '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  /**
   * Loads Paystack v2 inline script and resolves with a fresh PaystackPop instance.
   *
   * v2 API (confirmed from source):
   *   - window.PaystackPop is a CLASS — resumeTransaction is an INSTANCE method.
   *   - Correct usage: new PaystackPop().resumeTransaction(accessCode, callbacks)
   *   - resumeTransaction internally calls this.newTransaction({ accessCode, ... })
   *
   * WordPress / themes often load Paystack v1 which attaches a different
   * window.PaystackPop object without resumeTransaction. We force-reload v2
   * every time by removing the stale script tag AND deleting the global,
   * then verify the instance has resumeTransaction before resolving.
   */
  private loadPaystackV2(): Promise<any> {
    return new Promise((resolve, reject) => {
      const PAYSTACK_V2 = 'https://js.paystack.co/v2/inline.js';

      // Remove any existing Paystack script tag (v1 or v2)
      document.querySelectorAll('script[src*="paystack.co"]').forEach(s => s.remove());

      // Delete the global so v2 re-attaches cleanly
      delete (window as any).PaystackPop;

      const script = document.createElement('script');
      script.src   = PAYSTACK_V2;
      script.async = true;
      script.onload = () => {
        const PopClass = (window as any).PaystackPop;
        if (!PopClass) {
          reject(new Error('PaystackPop not found after v2 script load'));
          return;
        }
        const instance = new PopClass();
        if (typeof instance.resumeTransaction !== 'function') {
          reject(new Error('resumeTransaction missing on PaystackPop instance — v2 did not load correctly'));
          return;
        }
        resolve(instance);
      };
      script.onerror = () => reject(new Error('Paystack v2 script failed to load from CDN'));
      document.head.appendChild(script);
    });
  }

  getSubscriptions(): Observable<ICompanySubscriptions[]> {
    return this.http
      .get<ICompanySubscriptions[]>(`${this.base}/paystack/subscriptions`, { headers: this.authHeaders(), withCredentials: true })
      .pipe(
        tap(data => console.debug('[PaystackService] getSubscriptions ->', data)),
        catchError((err: HttpErrorResponse) => {
          console.error('[PaystackService] getSubscriptions failed', err.status, err.message);
          return of([]);
        }),
      );
  }

  getCompanyBilling(): Observable<ICompanyBilling[]> {
    return this.http
      .get<ICompanyBilling[]>(`${this.base}/paystack/companies`, { headers: this.authHeaders(), withCredentials: true })
      .pipe(
        tap(data => console.debug('[PaystackService] getCompanyBilling ->', data)),
        map(companies => companies.map(c => ({ ...c, cards: c.cards ?? [] }))),
        catchError((err: HttpErrorResponse) => {
          console.error('[PaystackService] getCompanyBilling failed', err.status, err.message);
          return of([]);
        }),
      );
  }

  getCardCaptureCode(companyId: number): Observable<ICardCaptureResult | null> {
    return this.http
      .post<ICardCaptureResult>(
        `${this.base}/paystack/manage-card-url`,
        { companyId },
        { headers: this.authHeaders(), withCredentials: true },
      )
      .pipe(
        tap(res => console.debug('[PaystackService] getCardCaptureCode ->', res)),
        catchError((err: HttpErrorResponse) => {
          console.error('[PaystackService] getCardCaptureCode failed', err.status, err.message);
          return of(null);
        }),
      );
  }

  removeCard(companyId: number, authorizationCode: string): Observable<{ success: boolean }> {
    return this.http
      .delete<{ success: boolean }>(
        `${this.base}/paystack/card`,
        { body: { companyId, authorizationCode }, headers: this.authHeaders(), withCredentials: true },
      )
      .pipe(
        tap(res => console.debug('[PaystackService] removeCard ->', res)),
        catchError((err: HttpErrorResponse) => {
          console.error('[PaystackService] removeCard failed', err.status, err.message);
          return of({ success: false });
        }),
      );
  }

  setDefaultCard(companyId: number, authorizationCode: string): Observable<{ success: boolean }> {
    return this.http
      .patch<{ success: boolean }>(
        `${this.base}/paystack/card/default`,
        { companyId, authorizationCode },
        { headers: this.authHeaders(), withCredentials: true },
      )
      .pipe(
        tap(res => console.debug('[PaystackService] setDefaultCard ->', res)),
        catchError((err: HttpErrorResponse) => {
          console.error('[PaystackService] setDefaultCard failed', err.status, err.message);
          return of({ success: false });
        }),
      );
  }

  verifyTransaction(reference: string): Observable<{ verified: boolean; status: string }> {
    return this.http
      .post<{ verified: boolean; status: string }>(
        `${this.base}/paystack/verify`,
        { reference },
        { headers: this.authHeaders(), withCredentials: true },
      )
      .pipe(
        tap(res => console.debug('[PaystackService] verifyTransaction ->', res)),
        catchError((err: HttpErrorResponse) => {
          console.error('[PaystackService] verifyTransaction failed', err.status, err.message);
          return of({ verified: false, status: 'error' });
        }),
      );
  }

  /**
   * Open Paystack inline popup using an access_code from the backend.
   *
   * Loads v2 fresh each time (clearing any stale v1 global from WordPress),
   * then calls instance.resumeTransaction(accessCode, callbacks).
   *
   * resumeTransaction signature (from v2 source):
   *   resumeTransaction(accessCode: string, { onSuccess, onCancel, onLoad, onError })
   */
  openPopup(
    accessCode: string,
    _email:    string,
    onSuccess: (reference: string) => void,
    onClose?:  () => void,
  ): void {
    this.loadPaystackV2()
      .then((popup: any) => {
        console.debug('[PaystackService] v2 loaded, calling resumeTransaction with accessCode:', accessCode);
        popup.resumeTransaction(accessCode, {
          onSuccess: (res: { reference: string }) => {
            this.verifyTransaction(res.reference).subscribe(result => {
              console.debug('[PaystackService] popup verified:', result);
              onSuccess(res.reference);
            });
          },
          onCancel: onClose ?? (() => {}),
        });
      })
      .catch(err => {
        console.error('[PaystackService] Failed to open Paystack popup:', err);
      });
  }
}
