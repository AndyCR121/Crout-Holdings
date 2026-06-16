import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { EnvironmentService } from './environment.service';
import { environment } from '../../environments/environment';

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

  /** Read ca_jwt cookie and return Authorization headers. */
  private authHeaders(): HttpHeaders {
    const match = document.cookie.match(/(?:^|;\s*)ca_jwt=([^;]*)/);
    const token = match ? decodeURIComponent(match[1]) : '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  /**
   * Ensures the Paystack inline script is loaded before resolving.
   * Works in both standalone (index.html) and WordPress (no index.html) contexts
   * by dynamically injecting the script tag if PaystackPop is not yet on window.
   */
  private ensurePaystackScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).PaystackPop) {
        resolve();
        return;
      }
      const existing = document.querySelector('script[src*="paystack.co"]');
      if (existing) {
        // Script tag exists but hasn't finished loading yet — wait for it
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Paystack script failed to load')));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload  = () => resolve();
      script.onerror = () => reject(new Error('Paystack script failed to load'));
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

  /**
   * Remove a saved card from a company's Paystack customer record.
   */
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

  /**
   * Set a card as the default (first) payment method for a company.
   * The API should reorder the customer's authorizations so this card comes first.
   */
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
   * Open Paystack inline popup.
   * Dynamically injects the Paystack script if not already present —
   * works in both standalone Angular and WordPress (Web Component) contexts.
   */
  openPopup(
    accessCode: string,
    email:      string,
    onSuccess:  (reference: string) => void,
    onClose?:   () => void,
  ): void {
    this.ensurePaystackScript()
      .then(() => {
        const PaystackPop = (window as any).PaystackPop;
        const handler = PaystackPop.setup({
          key:         environment.paystackPublicKey,
          access_code: accessCode,
          email,
          callback: (res: { reference: string }) => {
            this.verifyTransaction(res.reference).subscribe(result => {
              console.debug('[PaystackService] popup callback verified:', result);
              onSuccess(res.reference);
            });
          },
          onClose: onClose ?? (() => {}),
        });
        handler.openIframe();
      })
      .catch(err => {
        console.error('[PaystackService] Failed to load Paystack script:', err);
      });
  }
}
