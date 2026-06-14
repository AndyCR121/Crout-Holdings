import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaystackService, IPaystackCard } from '../../../../services/paystack.service';
import { ToastService } from '../../../../services/toast.service';

@Component({
  selector: 'ca-portal-payment-methods',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portal-payment-methods.component.html',
  styleUrls: ['./portal-payment-methods.component.scss'],
})
export class PortalPaymentMethodsComponent implements OnInit {
  private readonly paystack = inject(PaystackService);
  private readonly toast    = inject(ToastService);

  readonly cards   = signal<IPaystackCard[]>([]);
  readonly loading = signal(true);
  readonly adding  = signal(false);

  ngOnInit(): void {
    this.loadCards();
  }

  addCard(): void {
    this.adding.set(true);
    this.paystack.getCardCaptureCode().subscribe(res => {
      this.adding.set(false);
      if (!res?.access_code) {
        this.toast.error('Could not open payment setup. Please try again.');
        return;
      }
      this.paystack.openPopup(
        res.access_code,
        (_ref) => {
          this.toast.success('Card saved successfully!');
          this.loadCards();
        },
        () => this.toast.info('Card setup cancelled.'),
      );
    });
  }

  cardLabel(c: IPaystackCard): string {
    const brand = c.card_type?.replace(/_/g, ' ') ?? 'Card';
    return `${brand.charAt(0).toUpperCase() + brand.slice(1)} •••• ${c.last4}`;
  }

  cardExpiry(c: IPaystackCard): string {
    return `${c.exp_month}/${c.exp_year}`;
  }

  private loadCards(): void {
    this.loading.set(true);
    this.paystack.getSavedCards().subscribe(c => {
      this.cards.set(c);
      this.loading.set(false);
    });
  }
}
