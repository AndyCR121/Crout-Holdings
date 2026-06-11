import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

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
}

export interface IPaystackCard {
  authorization_code: string;
  card_type:          string;
  last4:              string;
  exp_month:          string;
  exp_year:           string;
  channel:            string;
  reusable:           boolean;
}

@Injectable({ providedIn: 'root' })
export class PaystackService {

  // TODO: integrate Paystack — fetch real subscriptions via Paystack API
  getSubscriptions(): Observable<IPaystackSubscription[]> {
    return of([]);
  }

  // TODO: integrate Paystack — fetch saved cards/authorizations via Paystack API
  getSavedCards(): Observable<IPaystackCard[]> {
    return of([]);
  }
}
