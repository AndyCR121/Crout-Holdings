import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../services/auth.service';
import { PaystackService, IPaystackCard } from '../../../../services/paystack.service';

@Component({
  selector: 'ca-portal-payment-methods',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portal-payment-methods.component.html',
  styleUrls: ['./portal-payment-methods.component.scss'],
})
export class PortalPaymentMethodsComponent implements OnInit {
  private readonly auth     = inject(AuthService);
  private readonly paystack = inject(PaystackService);

  readonly user    = computed(() => this.auth.currentUser());
  readonly cards   = signal<IPaystackCard[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.paystack.getSavedCards().subscribe({
      next: (c) => { this.cards.set(c); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
  }

  cardBrand(brand: string): string {
    return brand?.toLowerCase() ?? 'unknown';
  }

  maskedNumber(last4: string): string {
    return `•••• •••• •••• ${last4}`;
  }
}
