import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { PaystackService, ICompanyBilling, IPaystackCard } from '../../../../services/paystack.service';
import { ToastService } from '../../../../services/toast.service';

@Component({
  selector: 'ca-portal-payment-methods',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portal-payment-methods.component.html',
  styleUrls: ['./portal-payment-methods.component.scss'],
})
export class PortalPaymentMethodsComponent implements OnInit {
  private readonly paystack   = inject(PaystackService);
  private readonly toast      = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly companies = signal<ICompanyBilling[]>([]);
  readonly loading   = signal(true);
  readonly error     = signal<string | null>(null);

  // Track which company is currently opening the popup
  readonly addingFor = signal<number | null>(null);

  ngOnInit(): void {
    this.loadBilling();
  }

  addCard(company: ICompanyBilling): void {
    if (!company.hasEmail) {
      this.toast.error(`${company.companyName} has no email set. Please update it in your profile first.`);
      return;
    }
    this.addingFor.set(company.companyId);
    this.paystack.getCardCaptureCode(company.companyId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(res => {
        this.addingFor.set(null);
        if (!res?.access_code) {
          this.toast.error('Could not open payment setup. Please try again.');
          return;
        }
        this.paystack.openPopup(
          res.access_code,
          res.email,
          (_ref) => {
            this.toast.success(`Card added to ${res.companyName}!`);
            this.loadBilling();
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

  isAdding(companyId: number): boolean {
    return this.addingFor() === companyId;
  }

  loadBilling(): void {
    this.loading.set(true);
    this.error.set(null);
    this.paystack.getCompanyBilling()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          console.debug('[PaymentMethods] companies loaded:', data);
          this.companies.set(data);
          this.loading.set(false);
        },
        error: err => {
          console.error('[PaymentMethods] failed to load billing:', err);
          this.error.set('Failed to load payment methods. Please refresh.');
          this.loading.set(false);
        },
      });
  }
}
