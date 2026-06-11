import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface IPaystackSubscription {
  subscription_code:  string;
  status:             'active' | 'cancelled' | 'non-renewing' | 'attention';
  plan:               { name: string; amount: number; interval: string; };
  next_payment_date:  string; // ISO
  start:              string; // ISO
  service_name?:      string; // enriched on our end
  service_id?:        number;
}

export interface IPaystackCard {
  signature:    string;
  last4:        string;
  exp_month:    string;
  exp_year:     string;
  card_type:    string;
  bank:         string;
  channel:      string;
}

function getApiUrl(): string {
  return (window as any).__env?.apiUrl ?? '';
}

@Injectable({ providedIn: 'root' })
export class PaystackService {
  private readonly http = inject(HttpClient);
  private get base(): string { return getApiUrl(); }

  getSubscriptions(userId: number): Observable<IPaystackSubscription[]> {
    return this.http
      .get<IPaystackSubscription[]>(`${this.base}/billing/${userId}/subscriptions`, { withCredentials: true })
      .pipe(catchError(() => of(this._demoSubscriptions())));
  }

  getPaymentMethods(userId: number): Observable<IPaystackCard[]> {
    return this.http
      .get<IPaystackCard[]>(`${this.base}/billing/${userId}/payment-methods`, { withCredentials: true })
      .pipe(catchError(() => of(this._demoCards())));
  }

  cancelSubscription(subscriptionCode: string, emailToken: string): Observable<void> {
    return this.http
      .post<void>(`${this.base}/billing/subscriptions/${subscriptionCode}/cancel`,
        { email_token: emailToken }, { withCredentials: true })
      .pipe(catchError(() => of(undefined as void)));
  }

  // ── Demo fallbacks ─────────────────────────────────────────────────────────
  private _demoSubscriptions(): IPaystackSubscription[] {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    return [
      {
        subscription_code: 'SUB_demo_001',
        status: 'active',
        plan: { name: 'WhatsApp Agent — Monthly', amount: 300000, interval: 'monthly' },
        next_payment_date: next.toISOString(),
        start: new Date(Date.now() - 60 * 864e5).toISOString(),
        service_name: 'WhatsApp Agent',
        service_id: 1,
      },
      {
        subscription_code: 'SUB_demo_002',
        status: 'active',
        plan: { name: 'Project Management — Monthly', amount: 300000, interval: 'monthly' },
        next_payment_date: next.toISOString(),
        start: new Date(Date.now() - 90 * 864e5).toISOString(),
        service_name: 'Project Management System',
        service_id: 3,
      },
    ];
  }

  private _demoCards(): IPaystackCard[] {
    return [
      {
        signature: 'SIG_demo_visa',
        last4: '4242',
        exp_month: '12',
        exp_year:  '2027',
        card_type: 'visa',
        bank:      'First National Bank',
        channel:   'card',
      },
    ];
  }
}
