import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { IUserService, IService, IAddon, ICompany } from '../../../interfaces/i-service.interface';
import { PortalLeftMenuComponent } from '../../../components/left-menu/portal-left-menu.component';

// ─── Internal view-model types ─────────────────────────────────────────────────────────
export interface ServiceRow {
  userService:       IUserService;
  service:           IService;
  addons:            IAddon[];
  activeAddons:      string[];
  editing:           boolean;
  sidePanelOpen:     boolean;
  pendingAddonNames: Set<string>;
}

export interface CompanyGroup {
  company:  ICompany;
  rows:     ServiceRow[];
  expanded: boolean;
}

@Component({
  selector: 'ca-portal-services',
  standalone: true,
  imports: [CommonModule, PortalLeftMenuComponent],
  templateUrl: './portal-services.component.html',
  styleUrls: ['./portal-services.component.scss'],
})
export class PortalServicesComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api  = inject(ApiService);

  readonly user    = computed(() => this.auth.currentUser());
  readonly loading = signal(true);
  readonly saving  = signal<number | null>(null);

  private readonly _groups = signal<CompanyGroup[]>([]);

  /** All company groups with their service rows — used by template */
  readonly groups = computed(() => this._groups());

  /** True when at least one company has at least one service row */
  readonly hasAnyService = computed(() =>
    this._groups().some(g => g.rows.length > 0)
  );

  // ─── Lifecycle ────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const uid = this.user()?.userId;
    if (uid == null) { this.loading.set(false); return; }

    this.api.getCompaniesByUser(uid).pipe(
      switchMap(companies => {
        if (companies.length === 0) {
          this._groups.set([]);
          this.loading.set(false);
          return [];
        }
        return forkJoin(
          companies.map(company =>
            this.api.getCompanyServices(company.companyId).pipe(
              switchMap(userServices =>
                userServices.length > 0
                  ? forkJoin(
                      userServices.map(us =>
                        this.api.getAddonsByService(us.serviceId).pipe(
                          switchMap(addons => {
                            const activeAddons = this._parseActiveAddons(us.config, addons);
                            return [{
                              company,
                              us,
                              addons,
                              activeAddons,
                            }];
                          })
                        )
                      )
                    ).pipe(
                      switchMap(rowData => {
                        const rows: ServiceRow[] = rowData.map(rd => this._buildRow(rd.us, rd.addons, rd.activeAddons));
                        return [{ company, rows } as { company: ICompany; rows: ServiceRow[] }];
                      })
                    )
                  : [{ company, rows: [] as ServiceRow[] }]
              )
            )
          )
        );
      })
    ).subscribe({
      next: grouped => {
        this._groups.set(
          grouped.map(g => ({ company: g.company, rows: g.rows, expanded: true }))
        );
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // ─── Private helpers ───────────────────────────────────────────────────────────

  private _buildRow(us: IUserService, addons: IAddon[], activeAddons: string[]): ServiceRow {
    return {
      userService:       us,
      service:           { serviceId: us.serviceId, serviceName: '', price: 0, hasAddons: false, conditional: false },
      addons,
      activeAddons,
      editing:           false,
      sidePanelOpen:     false,
      pendingAddonNames: new Set(activeAddons),
    };
  }

  private _parseActiveAddons(config: string, addons: IAddon[]): string[] {
    try {
      const parsed = JSON.parse(config ?? '{}');
      const ids: number[] = parsed.addonIds ?? [];
      return addons.filter(a => ids.includes(a.addonId)).map(a => a.addonName);
    } catch {
      return [];
    }
  }

  private _refresh(): void {
    this._groups.update(g => [...g]);
  }

  // ─── Template-bound group actions ─────────────────────────────────────────────────

  toggleGroup(group: CompanyGroup): void {
    group.expanded = !group.expanded;
    this._refresh();
  }

  // ─── Template-bound row actions ───────────────────────────────────────────────────

  startEdit(row: ServiceRow): void {
    row.pendingAddonNames = new Set(row.activeAddons);
    row.editing = true;
    this._refresh();
  }

  cancelEdit(row: ServiceRow): void {
    row.editing = false;
    this._refresh();
  }

  isSelected(row: ServiceRow, addonName: string): boolean {
    return row.pendingAddonNames.has(addonName);
  }

  toggleAddon(row: ServiceRow, addonName: string): void {
    if (row.pendingAddonNames.has(addonName)) {
      row.pendingAddonNames.delete(addonName);
    } else {
      row.pendingAddonNames.add(addonName);
    }
    this._refresh();
  }

  submitConfigRequest(row: ServiceRow): void {
    const id = row.userService.userServiceId;
    if (id == null) return;
    this.saving.set(row.userService.serviceId);

    const addonIds = row.addons
      .filter(a => row.pendingAddonNames.has(a.addonName))
      .map(a => a.addonId);

    const dto: Partial<IUserService> = {
      ...row.userService,
      addonIds,
      config: JSON.stringify({ addonIds }),
    };

    this.api.updateUserService(id, dto).subscribe({
      next: updated => {
        row.userService    = updated;
        row.activeAddons   = [...row.pendingAddonNames];
        row.editing        = false;
        this.saving.set(null);
        this._refresh();
      },
      error: () => this.saving.set(null),
    });
  }

  openSidePanel(row: ServiceRow): void {
    row.sidePanelOpen = true;
    this._refresh();
  }

  closeSidePanel(row: ServiceRow): void {
    row.sidePanelOpen = false;
    this._refresh();
  }

  // ─── Status helpers ──────────────────────────────────────────────────────────────

  statusLabel(s: number): string {
    return (['Disabled', 'In Development', 'Live', 'Pending'] as const)[s] ?? 'Unknown';
  }

  statusClass(s: number): string {
    return (['status-disabled', 'status-dev', 'status-live', 'status-pending'] as const)[s] ?? '';
  }
}
