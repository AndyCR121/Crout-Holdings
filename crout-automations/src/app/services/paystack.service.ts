import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { EnvironmentService } from './environment.service';
import { environment } from '../../environments/environment';

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

export interface IPaystackAccessCode {
  access_code:       string;
  reference:         string;
  authorization_url: string;
}

@Injectable({ providedIn: 'root' })
export class PaystackService {
  private readonly http = inject(HttpClient);
  private readonly env  = inject(EnvironmentService);
  private get base() { return this.env.apiUrl; }

  /** Fetch all Paystack subscriptions matched to the user's company email */
  getSubscriptions(): Observable<IPaystackSubscription[]> {
    return this.http
      .get<{ data: IPaystackSubscription[] }>(
        `${this.base}/paystack/subscriptions`,
        { withCredentials: true },
      )
      .pipe(
        map(r => r?.data ?? []),
        catchError(() => of([])),
      );
  }

  /** Fetch all reusable saved cards linked to the user's company email */
  getSavedCards(): Observable<IPaystackCard[]> {
    return this.http
      .get<IPaystackCard[]>(
        `${this.base}/paystack/cards`,
        { withCredentials: true },
      )
      .pipe(catchError(() => of([])));
  }

  /**
   * Ask the backend to initialise a Paystack transaction for card capture.
   * Returns { access_code, reference } used to open the inline popup.
   */
  getCardCaptureCode(): Observable<IPaystackAccessCode | null> {
    return this.http
      .post<IPaystackAccessCode>(
        `${this.base}/paystack/manage-card-url`,
        {},
        { withCredentials: true },
      )
      .pipe(catchError(() => of(null)));
  }

  /**
   * Open Paystack inline popup.
   *
   * The public key is passed here — it is designed to be client-side visible.
   * The SECRET key lives ONLY in the backend and is never sent to the browser.
   *
   * Requires <script src="https://js.paystack.co/v1/inline.js"> in index.html.
   */
  openPopup(
    accessCode: string,
    onSuccess:  (reference: string) => void,
    onClose?:   () => void,
  ): void {
    const PaystackPop = (window as any).PaystackPop;
    if (!PaystackPop) {
      console.error(
        '[PaystackService] PaystackPop not found. '
        + 'Ensure https://js.paystack.co/v1/inline.js is loaded in index.html.',
      );
      return;
    }
    const handler = PaystackPop.setup({
      key:         environment.paystackPublicKey,   // ← public key required by popup
      access_code: accessCode,                      // ← pre-initialised transaction
      callback:    (res: { reference: string }) => onSuccess(res.reference),
      onClose:     onClose ?? (() => {}),
    });
    handler.openIframe();
  }
}
