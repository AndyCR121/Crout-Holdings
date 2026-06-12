import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../services/auth.service';
import { ApiService } from '../../../../services/api.service';
import { PaystackService, IPaystackSubscription } from '../../../../services/paystack.service';
import { IUserService, IService, ICompany } from '../../../../interfaces/i-service.interface';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

interface SubRow {
  userService:  IUserService;
  service:      IService | undefined;
  company:      ICompany | undefined;
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
    const uid = this.user()?.userId;
    if (uid == null) { this.loading.set(false); return; }

    this.api.getServices().pipe(
      switchMap(svcs =>
        this.api.getCompaniesByUser(uid).pipe(
          switchMap(companies => {
            if (companies.length === 0) {
              return of({ svcs, companies, allUserSvcs: [] as IUserService[] });
            }
            return forkJoin(
              companies.map(c => this.api.getCompanyServices(c.companyId))
            ).pipe(
              switchMap(results => of({
                svcs,
                companies,
                allUserSvcs: ([] as IUserService[]).concat(...results),
              }))
            );
          })
        )
      ),
      switchMap(({ svcs, companies, allUserSvcs }) =>
        this.paystack.getSubscriptions().pipe(
          switchMap(paystackSubs => {
            const built: SubRow[] = allUserSvcs.map((us: IUserService) => ({
              userService:  us,
              service:      svcs.find((s: IService) => s.serviceId === us.serviceId),
              company:      companies.find((c: ICompany) => c.companyId === us.companyId),
              subscription: paystackSubs.find(ps => ps.subscription_code === us.subscriptionId) ?? null,
            }));
            return of(built);
          })
        )
      )
    ).subscribe(built => {
      this.rows.set(built);
      this.loading.set(false);
    });
  }

  statusLabel(s: number): string {
    return ['Disabled', 'In Development', 'Live', 'Pending'][s] ?? 'Unknown';
  }

  statusClass(s: number): string {
    return ['status-disabled', 'status-dev', 'status-live', 'status-pending'][s] ?? '';
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
