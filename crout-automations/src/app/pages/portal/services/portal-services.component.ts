import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../services/toast.service';
import { IUserService, IService, IAddon, ICompany } from '../../../interfaces/i-service.interface';

interface ServiceRow {
  userService:   IUserService;
  service:       IService;
  addons:        IAddon[];
  activeAddons:  string[];
  editing:       boolean;
  editConfig:    string[];
  sidePanelOpen: boolean;
}

interface CompanyGroup {
  company:  ICompany;
  rows:     ServiceRow[];
  expanded: boolean;
}

@Component({
  selector: 'ca-portal-services',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './portal-services.component.html',
  styleUrls: ['./portal-services.component.scss'],
})
export class PortalServicesComponent implements OnInit {
  private readonly auth  = inject(AuthService);
  private readonly api   = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly user    = computed(() => this.auth.currentUser());
  readonly groups  = signal<CompanyGroup[]>([]);
  readonly loading = signal(true);
  readonly saving  = signal<number | null>(null);

  ngOnInit(): void {
    const uid = this.user()?.user_id;
    if (uid == null) { this.loading.set(false); return; }

    // Step 1: load services + companies in parallel
    forkJoin({
      svcs:      this.api.getServices(),
      companies: this.api.getCompaniesByUser(uid),
    }).pipe(
      switchMap(({ svcs, companies }) => {
        if (!companies.length) {
          return of({ svcs, companies, companyServices: [] as IUserService[][], addons: [] as IAddon[][] });
        }
        // Step 2: load per-company services + per-service addons in parallel
        return forkJoin({
          svcs:            of(svcs),
          companies:       of(companies),
          companyServices: forkJoin(companies.map((c: ICompany) => this.api.getCompanyServices(c.company_id))),
          addons:          svcs.length
            ? forkJoin(svcs.map((s: IService) => this.api.getAddonsByService(s.service_id)))
            : of([] as IAddon[][]),
        });
      })
    ).subscribe({
      next: ({ svcs, companies, companyServices, addons }) => {
        const allAddons: IAddon[] = (addons as IAddon[][]).flat();

        const built: CompanyGroup[] = (companies as ICompany[]).map((company: ICompany, ci: number) => {
          const us: IUserService[] = (companyServices as IUserService[][])[ci] ?? [];
          const rows: ServiceRow[] = us.map((u: IUserService) => {
            const svc       = (svcs as IService[]).find((s: IService) => s.service_id === u.service_id)!;
            const rowAddons = allAddons.filter((a: IAddon) => a.service_id === u.service_id);
            const active    = this._parseConfig(u.config);
            return {
              userService:   u,
              service:       svc,
              addons:        rowAddons,
              activeAddons:  active,
              editing:       false,
              editConfig:    [...active],
              sidePanelOpen: false,
            };
          });
          return { company, rows, expanded: true };
        });

        built.sort((a, b) => a.company.company_id - b.company.company_id);
        this.groups.set(built);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private _parseConfig(cfg: string): string[] {
    try { const p = JSON.parse(cfg); return p.integrations ?? []; } catch { return []; }
  }

  toggleGroup(group: CompanyGroup): void {
    group.expanded = !group.expanded;
    this.groups.update(g => [...g]);
  }

  startEdit(row: ServiceRow): void {
    row.editing    = true;
    row.editConfig = [...row.activeAddons];
    this.groups.update(g => [...g]);
  }

  cancelEdit(row: ServiceRow): void {
    row.editing = false;
    this.groups.update(g => [...g]);
  }

  toggleAddon(row: ServiceRow, addonName: string): void {
    const idx = row.editConfig.indexOf(addonName);
    if (idx > -1) row.editConfig.splice(idx, 1);
    else          row.editConfig.push(addonName);
    this.groups.update(g => [...g]);
  }

  isSelected(row: ServiceRow, name: string): boolean {
    return row.editConfig.includes(name);
  }

  submitConfigRequest(row: ServiceRow): void {
    this.saving.set(row.userService.service_id);
    const payload = { integrations: row.editConfig };
    this.api['http']?.post?.(
      `/companies/${row.userService.company_id}/services/${row.userService.service_id}/config-request`,
      payload
    ).subscribe?.();
    setTimeout(() => {
      row.activeAddons = [...row.editConfig];
      row.editing      = false;
      this.saving.set(null);
      this.groups.update(g => [...g]);
      this.toast.success(`Configuration request submitted for ${row.service.serviceName}.`);
    }, 800);
  }

  openSidePanel(row: ServiceRow):  void { row.sidePanelOpen = true;  this.groups.update(g => [...g]); }
  closeSidePanel(row: ServiceRow): void { row.sidePanelOpen = false; this.groups.update(g => [...g]); }

  statusLabel(s: number): string {
    return ['Disabled', 'In Development', 'Live', 'Pending'][s] ?? 'Unknown';
  }

  statusClass(s: number): string {
    return ['status-disabled', 'status-dev', 'status-live', 'status-pending'][s] ?? '';
  }

  hasAnyService(): boolean {
    return this.groups().some(g => g.rows.length > 0);
  }
}
