import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { PaystackService, ICompanyBilling, IPaystackCard } from '../../../../services/paystack.service';
import { ToastService } from '../../../../services/toast.service';
import { PortalSidebarComponent } from '../../../../components/portal-sidebar/portal-sidebar.component';

@Component({
  selector: 'ca-portal-payment-methods',
  standalone: true,
  imports: [CommonModule, PortalSidebarComponent],
  templateUrl: './portal-payment-methods.component.html',
  styleUrls: ['./portal-payment-methods.component.scss'],
})
export class PortalPaymentMethodsComponent implements OnInit {
  private readonly paystack   = inject(PaystackService);
  private readonly toast      = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly companies      = signal<ICompanyBilling[]>([]);
  readonly loading        = signal(true);
  readonly error          = signal<string | null>(null);
  readonly addingFor      = signal<number | null>(null);
  /** authorization_code of the card currently awaiting remove confirmation */
  readonly confirmRemove  = signal<string | null>(null);
  /** authorization_code of the card currently being removed */
  readonly removingCard   = signal<string | null>(null);
  /** authorization_code of the card currently being set as default */
  readonly settingDefault = signal<string | null>(null);

  ngOnInit(): void {
    this.loadBilling();
  }

  // ── Add card ──────────────────────────────────────────────────────────────

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

  // ── Remove card ───────────────────────────────────────────────────────────

  /** First click: enter confirmation state. Second click: execute. */
  requestRemove(authCode: string): void {
    if (this.confirmRemove() === authCode) {
      this.executeRemove(authCode);
    } else {
      this.confirmRemove.set(authCode);
    }
  }

  cancelRemove(): void {
    this.confirmRemove.set(null);
  }

  private executeRemove(authCode: string): void {
    const companyId = this.companyIdForCard(authCode);
    if (!companyId) return;
    this.removingCard.set(authCode);
    this.confirmRemove.set(null);
    this.paystack.removeCard(companyId, authCode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(res => {
        this.removingCard.set(null);
        if (res.success) {
          // Optimistic update
          this.companies.update(list =>
            list.map(c =>
              c.companyId === companyId
                ? { ...c, cards: c.cards.filter(k => k.authorization_code !== authCode) }
                : c
            )
          );
          this.toast.success('Card removed.');
        } else {
          this.toast.error('Failed to remove card. Please try again.');
        }
      });
  }

  // ── Set default card ──────────────────────────────────────────────────────

  setDefault(authCode: string): void {
    const companyId = this.companyIdForCard(authCode);
    if (!companyId) return;
    this.settingDefault.set(authCode);
    this.paystack.setDefaultCard(companyId, authCode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(res => {
        this.settingDefault.set(null);
        if (res.success) {
          // Reorder cards optimistically — move chosen card to front
          this.companies.update(list =>
            list.map(c => {
              if (c.companyId !== companyId) return c;
              const chosen = c.cards.find(k => k.authorization_code === authCode)!;
              const rest   = c.cards.filter(k => k.authorization_code !== authCode);
              return { ...c, cards: [chosen, ...rest] };
            })
          );
          this.toast.success('Default payment method updated.');
        } else {
          this.toast.error('Failed to update default card. Please try again.');
        }
      });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private companyIdForCard(authCode: string): number | null {
    return this.companies().find(c =>
      c.cards.some(k => k.authorization_code === authCode)
    )?.companyId ?? null;
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

  isConfirmingRemove(authCode: string): boolean {
    return this.confirmRemove() === authCode;
  }

  isRemoving(authCode: string): boolean {
    return this.removingCard() === authCode;
  }

  isSettingDefault(authCode: string): boolean {
    return this.settingDefault() === authCode;
  }

  loadBilling(): void {
    this.loading.set(true);
    this.error.set(null);
    this.paystack.getCompanyBilling()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
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
