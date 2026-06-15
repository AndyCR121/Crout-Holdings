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

/** Shape returned by the enriched /paystack/subscriptions endpoint */
export interface IPaystackSubscription {
  subscription_code:  string;
  status:             string;            // 'active' | 'cancelled' | 'non-renewing'
  amount:             number;
  next_payment_date:  string | null;
  plan:               IPaystackPlan | null;
  createdAt:          string;
  // DB-enriched fields
  linked:             boolean;
  userServiceId:      number | null;
  serviceId:          number | null;
  serviceName:        string | null;
  serviceStatus:      number | null;     // 0 Disabled | 1 In Dev | 2 Live | 3 Pending
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
   * Verify a transaction reference server-side.
   * MUST be called after the Paystack popup fires onSuccess —
   * without this Paystack does not commit the authorization to
   * the customer record, so the card won't appear on future fetches.
   */
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
   * Calls verifyTransaction automatically in onSuccess before invoking the callback.
   */
  openPopup(
    accessCode: string,
    email:      string,
    onSuccess:  (reference: string) => void,
    onClose?:   () => void,
  ): void {
    const PaystackPop = (window as any).PaystackPop;
    if (!PaystackPop) {
      console.error('[PaystackService] PaystackPop not found. Ensure https://js.paystack.co/v1/inline.js is in index.html.');
      return;
    }
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
  }
}
