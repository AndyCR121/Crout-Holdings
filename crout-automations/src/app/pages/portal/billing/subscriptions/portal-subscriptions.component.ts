import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';
import { PaystackService, ICompanySubscriptions, IPaystackSubscription } from '../../../../services/paystack.service';

@Component({
  selector: 'ca-portal-subscriptions',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './portal-subscriptions.component.html',
  styleUrls: ['./portal-subscriptions.component.scss'],
})
export class PortalSubscriptionsComponent implements OnInit {
  private readonly auth     = inject(AuthService);
  private readonly paystack = inject(PaystackService);

  readonly user      = computed(() => this.auth.currentUser());
  readonly companies = signal<ICompanySubscriptions[]>([]);
  readonly loading   = signal(true);
  readonly error     = signal<string | null>(null);

  ngOnInit(): void {
    this.paystack.getSubscriptions().subscribe({
      next: (data) => {
        this.companies.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load subscriptions.');
        this.loading.set(false);
      },
    });
  }

  totalSubs(): number {
    return this.companies().reduce((acc, c) => acc + c.subscriptions.length, 0);
  }

  paystackStatusClass(status: string): string {
    return ({
      'active':        'badge--active',
      'cancelled':     'badge--cancelled',
      'non-renewing':  'badge--warning',
    } as Record<string, string>)[status] ?? 'badge--unknown';
  }

  serviceStatusLabel(s: number | null): string {
    return (['Disabled', 'In Development', 'Live', 'Pending'] as const)[s ?? 0] ?? 'Unknown';
  }

  serviceStatusClass(s: number | null): string {
    return (['status-disabled', 'status-dev', 'status-live', 'status-pending'] as const)[s ?? 0] ?? '';
  }

  formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  formatPrice(amount: number | null | undefined): string {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount / 100);
  }
}
