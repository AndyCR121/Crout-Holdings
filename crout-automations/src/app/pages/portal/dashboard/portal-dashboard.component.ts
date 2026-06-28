import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { N8nService, IDailyRun } from '../../../services/n8n.service';
import { IUserService, IService, ICompany } from '../../../interfaces/i-service.interface';
import { CompanySvcFilterPipe } from '../../../pipes/company-svc-filter.pipe';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { PortalSidebarComponent } from '../../../components/portal-sidebar/portal-sidebar.component';
import { IntegrationStatusBadgeComponent } from '../../../components/integration-status-badge/integration-status-badge.component';
import { IntegrationStatusService } from '../../../services/integration-status.service';

@Component({
  selector: 'ca-portal-dashboard',
  standalone: true,
  imports: [CommonModule, CompanySvcFilterPipe, PortalSidebarComponent, IntegrationStatusBadgeComponent],
  templateUrl: './portal-dashboard.component.html',
  styleUrls: ['./portal-dashboard.component.scss'],
})
export class PortalDashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api  = inject(ApiService);
  private readonly n8n  = inject(N8nService);
  private readonly integrationStatus = inject(IntegrationStatusService);

  readonly development = true;

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
      if (!this.development) {
        allUserSvcs.forEach(us => {
          this.n8n.getDailyRuns(`workflow_${us.serviceId}`, 14).subscribe(runs => {
            this.dailyRuns.update(m => ({ ...m, [us.serviceId]: runs }));
          });
        });
      }
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
      const values = [
        ...(Array.isArray(parsed.integrations) ? parsed.integrations : []),
        ...(Array.isArray(parsed.trigger) ? parsed.trigger : []),
        ...(Array.isArray(parsed.action) ? parsed.action : []),
        ...(Array.isArray(parsed.output) ? parsed.output : []),
      ];
      const labels = values
        .map(value => this.formatChipValue(value))
        .filter((value): value is string => !!value);
      return [...new Set(labels)];
    } catch {
      return config ? [this.formatChipValue(config) ?? 'Not configured'] : ['Not configured'];
    }
  }

  formatChipValue(value: unknown): string | null {
    if (value == null || value === '') return 'Not configured';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value !== 'object') return String(value);

    const record = value as Record<string, any>;
    const nestedAddon = record['addon'];
    if (nestedAddon && typeof nestedAddon === 'object') {
      const nested = nestedAddon as Record<string, any>;
      return nested['addonName'] ?? nested['AddonName'] ?? nested['name'] ?? nested['label'] ?? null;
    }

    return record['label']
      ?? record['name']
      ?? record['addonName']
      ?? record['AddonName']
      ?? record['title']
      ?? record['type']
      ?? record['value']
      ?? JSON.stringify(record);
  }

  statusLabel(s: number): string {
    return this.integrationStatus.label(null, s);
  }

  statusClass(s: number): string {
    return this.integrationStatus.cssClass(null, s);
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
