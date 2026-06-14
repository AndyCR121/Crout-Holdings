import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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
  subscription_code: string;
  status:            string;
  amount:            number;
  next_payment_date: string | null;
  plan:              IPaystackPlan | null;
  createdAt:         string;
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

  getSubscriptions(): Observable<ICompanySubscriptions[]> {
    return this.http
      .get<ICompanySubscriptions[]>(`${this.base}/paystack/subscriptions`, { withCredentials: true })
      .pipe(catchError(() => of([])));
  }

  /** Returns all companies with their saved Paystack cards */
  getCompanyBilling(): Observable<ICompanyBilling[]> {
    return this.http
      .get<ICompanyBilling[]>(`${this.base}/paystack/companies`, { withCredentials: true })
      .pipe(catchError(() => of([])));
  }

  /**
   * Initialise a card-capture transaction for a specific company.
   * The company's email is resolved server-side — never guessed on the frontend.
   */
  getCardCaptureCode(companyId: number): Observable<ICardCaptureResult | null> {
    return this.http
      .post<ICardCaptureResult>(
        `${this.base}/paystack/manage-card-url`,
        { companyId },
        { withCredentials: true },
      )
      .pipe(catchError(() => of(null)));
  }

  /**
   * Open Paystack inline popup.
   * Public key is passed here — it is safe to be client-side visible.
   * Secret key lives ONLY in the backend.
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
      email,                              // ← required by Paystack popup validation
      callback:    (res: { reference: string }) => onSuccess(res.reference),
      onClose:     onClose ?? (() => {}),
    });
    handler.openIframe();
  }
}
