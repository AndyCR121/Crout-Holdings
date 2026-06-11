import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';

export interface IPaystackPlan {
  name: string;
  interval: string;
  amount: number;
}

export interface IPaystackSubscription {
  subscription_code: string;
  status: string;
  amount: number;
  next_payment_date: string | null;
  plan: IPaystackPlan | null;
  createdAt: string;
}

export interface IPaystackCard {
  authorization_code: string;
  card_type: string;
  last4: string;
  exp_month: string;
  exp_year: string;
  channel: string;
  reusable: boolean;
}

function getApiUrl(): string {
  return (window as any).__env?.apiUrl ?? '';
}

/** Demo data used when the real API is unavailable */
const DEMO_SUBSCRIPTIONS: IPaystackSubscription[] = [
  {
    subscription_code: 'SUB_demo001xyzabc',
    status: 'active',
    amount: 300000,
    next_payment_date: new Date(Date.now() + 18 * 864e5).toISOString(),
    plan: { name: 'Starter Plan', interval: 'monthly', amount: 300000 },
    createdAt: new Date(Date.now() - 30 * 864e5).toISOString(),
  },
  {
    subscription_code: 'SUB_demo002abcxyz',
    status: 'active',
    amount: 500000,
    next_payment_date: new Date(Date.now() + 12 * 864e5).toISOString(),
    plan: { name: 'Growth Plan', interval: 'monthly', amount: 500000 },
    createdAt: new Date(Date.now() - 60 * 864e5).toISOString(),
  },
];

const DEMO_CARDS: IPaystackCard[] = [
  {
    authorization_code: 'AUTH_demo001',
    card_type: 'Visa',
    last4: '4081',
    exp_month: '12',
    exp_year: '2027',
    channel: 'card',
    reusable: true,
  },
];

@Injectable({ providedIn: 'root' })
export class PaystackService {
  private readonly http = inject(HttpClient);
  private get base(): string { return getApiUrl(); }

  /**
   * Fetch subscriptions for the authenticated customer from Paystack.
   * Falls back to DEMO_SUBSCRIPTIONS if the backend is unavailable.
   */
  getSubscriptions(): Observable<IPaystackSubscription[]> {
    return this.http
      .get<IPaystackSubscription[]>(`${this.base}/billing/subscriptions`, { withCredentials: true })
      .pipe(catchError(() => of(DEMO_SUBSCRIPTIONS)));
  }

  /**
   * Fetch saved payment authorisations (cards) for the authenticated customer.
   * Falls back to DEMO_CARDS if the backend is unavailable.
   */
  getSavedCards(): Observable<IPaystackCard[]> {
    return this.http
      .get<IPaystackCard[]>(`${this.base}/billing/cards`, { withCredentials: true })
      .pipe(catchError(() => of(DEMO_CARDS)));
  }
}
