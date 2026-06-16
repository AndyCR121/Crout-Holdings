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
   * Ensures Paystack v2 inline script is loaded.
   *
   * IMPORTANT — v2 API facts (confirmed from source):
   *   - window.PaystackPop is a CLASS/CONSTRUCTOR, not a static utility object.
   *   - There is NO static PaystackPop.resumeTransaction() method.
   *   - To use an access_code, you instantiate: new PaystackPop()
   *     then call instance.newTransaction({ accessCode }) which internally
   *     calls verify_access_code and opens the iframe.
   *
   * We delete any stale global (e.g. v1 loaded by WordPress) before
   * injecting v2 so the constructor is always the v2 version.
   */
  private ensurePaystackScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const PAYSTACK_V2 = 'https://js.paystack.co/v2/inline.js';

      if ((window as any).__paystackV2Loaded) {
        resolve();
        return;
      }

      // Remove stale DOM script tag (e.g. v1 from a WordPress plugin/theme)
      const stale = document.querySelector('script[src*="paystack.co"]');
      if (stale) stale.remove();

      // Delete the already-executed global from memory — removing the <script>
      // tag alone does NOT clear an already-executed global.
      delete (window as any).PaystackPop;

      const script = document.createElement('script');
      script.src   = PAYSTACK_V2;
      script.async = true;
      script.onload = () => {
        (window as any).__paystackV2Loaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Paystack v2 script failed to load'));
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
   * v2 correct usage:
   *   const popup = new PaystackPop();
   *   popup.newTransaction({ accessCode, onSuccess, onCancel })
   *
   * This internally calls verify_access_code on Paystack's API
   * (no public key / amount / email needed on the frontend)
   * and opens the checkout iframe directly.
   *
   * Note: onCancel maps to the v2 onCancel callback (not onClose).
   */
  openPopup(
    accessCode: string,
    _email:    string,   // kept for API compatibility — not needed by v2 accessCode flow
    onSuccess: (reference: string) => void,
    onClose?:  () => void,
  ): void {
    this.ensurePaystackScript()
      .then(() => {
        const PaystackPop = (window as any).PaystackPop;
        const popup = new PaystackPop();

        popup.newTransaction({
          accessCode,
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
