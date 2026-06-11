import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../services/auth.service';
import { ApiService } from '../../../../services/api.service';
import { PaystackService, IPaystackSubscription } from '../../../../services/paystack.service';
import { IUserService, IService } from '../../../../interfaces/i-service.interface';

interface SubRow {
  userService:  IUserService;
  service:      IService | undefined;
  subscription: IPaystackSubscription | null;
}

@Component({
  selector: 'ca-portal-subscriptions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portal-subscriptions.component.html',
  styleUrls: ['./portal-subscriptions.component.scss'],
})
export class PortalSubscriptionsComponent implements OnInit {
  private readonly auth     = inject(AuthService);
  private readonly api      = inject(ApiService);
  private readonly paystack = inject(PaystackService);

  readonly user    = computed(() => this.auth.currentUser());
  readonly rows    = signal<SubRow[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    const uid = this.user()?.user_id;
    if (uid == null) { this.loading.set(false); return; }

    this.api.getServices().subscribe(svcs => {
      this.api.getUserServices(uid).subscribe(userSvcs => {
        // Fetch Paystack subscriptions list
        this.paystack.getSubscriptions().subscribe(paystackSubs => {
          const built: SubRow[] = userSvcs.map(us => {
            const svc = svcs.find(s => s.service_id === us.service_id);
            const sub = paystackSubs.find(ps => ps.subscription_code === us.subscription_id) ?? null;
            return { userService: us, service: svc, subscription: sub };
          });
          this.rows.set(built);
          this.loading.set(false);
        });
      });
    });
  }

  statusLabel(s: number): string {
    return ['Disabled','In Development','Live','Pending'][s] ?? 'Unknown';
  }

  statusClass(s: number): string {
    return ['status-disabled','status-dev','status-live','status-pending'][s] ?? '';
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
