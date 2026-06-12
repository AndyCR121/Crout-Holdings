import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { N8nService, IDailyRun } from '../../../services/n8n.service';
import { IUserService, IService, ICompany } from '../../../interfaces/i-service.interface';
import { CompanySvcFilterPipe } from '../../../pipes/company-svc-filter.pipe';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'ca-portal-dashboard',
  standalone: true,
  imports: [CommonModule, CompanySvcFilterPipe],
  templateUrl: './portal-dashboard.component.html',
  styleUrls: ['./portal-dashboard.component.scss'],
})
export class PortalDashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api  = inject(ApiService);
  private readonly n8n  = inject(N8nService);

  readonly user         = computed(() => this.auth.currentUser());
  readonly companies    = signal<ICompany[]>([]);
  readonly userServices = signal<IUserService[]>([]);
  readonly allServices  = signal<IService[]>([]);
  readonly dailyRuns    = signal<{ [key: number]: IDailyRun[] }>({});
  readonly loading      = signal(true);

  ngOnInit(): void {
    const uid = this.user()?.userId;
    if (uid == null) { this.loading.set(false); return; }

    this.api.getServices().pipe(
      switchMap(svcs => {
        this.allServices.set(svcs);
        return this.api.getCompaniesByUser(uid);
      }),
      switchMap(companies => {
        this.companies.set(companies);
        if (companies.length === 0) return of([] as IUserService[]);
        return forkJoin(
          companies.map(c => this.api.getCompanyServices(c.companyId))
        ).pipe(
          switchMap(results => of(([] as IUserService[]).concat(...results)))
        );
      })
    ).subscribe(allUserSvcs => {
      this.userServices.set(allUserSvcs);
      this.loading.set(false);
      allUserSvcs.forEach(us => {
        this.n8n.getDailyRuns(`workflow_${us.serviceId}`, 14).subscribe(runs => {
          this.dailyRuns.update(m => ({ ...m, [us.serviceId]: runs }));
        });
      });
    });
  }

  getService(id: number): IService | undefined {
    return this.allServices().find(s => s.serviceId === id);
  }

  getCompany(id: number): ICompany | undefined {
    return this.companies().find(c => c.companyId === id);
  }

  getAddonNames(config: string): string[] {
    try {
      const parsed = JSON.parse(config);
      return parsed.integrations ?? [];
    } catch { return []; }
  }

  statusLabel(s: number): string {
    return ['Disabled', 'In Development', 'Live', 'Pending'][s] ?? 'Unknown';
  }

  statusClass(s: number): string {
    return ['status-disabled', 'status-dev', 'status-live', 'status-pending'][s] ?? '';
  }

  chartBars(serviceId: number): { x: number; h: number; w: number; isError: boolean; label: string }[] {
    const runs = this.dailyRuns()[serviceId] ?? [];
    if (runs.length === 0) return [];
    const max  = Math.max(...runs.map(r => r.success + r.error), 1);
    const W    = 560;
    const H    = 80;
    const barW = Math.max(2, Math.floor((W - runs.length) / runs.length));
    return runs.map((r, i) => ({
      x:       i * (barW + 1),
      h:       Math.round(((r.success + r.error) / max) * H),
      w:       barW,
      isError: r.error > 0,
      label:   r.date.slice(5),
    }));
  }
}
