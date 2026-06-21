import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../services/toast.service';
import { IUserService, IService, IAddon, ICompany } from '../../../interfaces/i-service.interface';
import { PortalSidebarComponent } from '../../../components/portal-sidebar/portal-sidebar.component';
import { PortalVideoEditorComponent } from '../video-editor/portal-video-editor.component';

interface ServiceRow {
  userService:   IUserService;
  service:       IService;
  addons:        IAddon[];
  activeAddons:  string[];
  editing:       boolean;
  editConfig:    string[];
  sidePanelOpen: boolean;
  videoEditorOpen: boolean;
}

interface CompanyGroup {
  company:  ICompany;
  rows:     ServiceRow[];
  expanded: boolean;
}

@Component({
  selector: 'ca-portal-services',
  standalone: true,
  imports: [CommonModule, FormsModule, PortalSidebarComponent, PortalVideoEditorComponent],
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
    const uid = this.user()?.userId;
    if (uid == null) { this.loading.set(false); return; }

    forkJoin({
      svcs:      this.api.getServices(),
      companies: this.api.getCompaniesByUser(uid),
    }).pipe(
      switchMap(({ svcs, companies }) => {
        if (!companies.length) {
          return of({ svcs, companies, companyServices: [] as IUserService[][], addons: [] as IAddon[][] });
        }
        return forkJoin({
          svcs:            of(svcs),
          companies:       of(companies),
          companyServices: forkJoin(companies.map((c: ICompany) => this.api.getCompanyServices(c.companyId))),
          addons:          svcs.length
            ? forkJoin(svcs.map((s: IService) => this.api.getAddonsByService(s.serviceId)))
            : of([] as IAddon[][]),
        });
      })
    ).subscribe({
      next: ({ svcs, companies, companyServices, addons }) => {
        const allAddons: IAddon[] = (addons as IAddon[][]).flat();

        const built: CompanyGroup[] = (companies as ICompany[]).map((company: ICompany, ci: number) => {
          const us: IUserService[] = (companyServices as IUserService[][])[ci] ?? [];
          const rows: ServiceRow[] = us.map((u: IUserService) => {
            const svc       = (svcs as IService[]).find((s: IService) => s.serviceId === u.serviceId)!;
            const rowAddons = allAddons.filter((a: IAddon) => a.serviceId === u.serviceId);
            const active    = this._parseConfig(u.config);
            return {
              userService:   u,
              service:       svc,
              addons:        rowAddons,
              activeAddons:  active,
              editing:       false,
              editConfig:    [...active],
              sidePanelOpen: false,
              videoEditorOpen: false,
            };
          });
          return { company, rows, expanded: true };
        });

        built.sort((a, b) => a.company.companyId - b.company.companyId);
        this.groups.set(built);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private _parseConfig(cfg: string): string[] {
    try {
      const p = JSON.parse(cfg);
      const integrations = Array.isArray(p?.integrations) ? p.integrations : [];
      return integrations
        .map((item: unknown) => this._integrationLabel(item))
        .filter((label: string | null): label is string => !!label);
    } catch {
      return [];
    }
  }

  private _integrationLabel(item: unknown): string | null {
    if (typeof item === 'string') return item;
    if (item == null || typeof item !== 'object') return null;

    const record = item as Record<string, any>;
    const nestedAddon = record['addon'];
    if (nestedAddon && typeof nestedAddon === 'object') {
      const nested = nestedAddon as Record<string, any>;
      return nested['addonName'] ?? nested['AddonName'] ?? nested['name'] ?? nested['label'] ?? null;
    }

    return record['addonName'] ?? record['AddonName'] ?? record['name'] ?? record['label'] ?? record['serviceName'] ?? null;
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
    this.saving.set(row.userService.serviceId);
    const payload = { integrations: row.editConfig };
    this.api['http']?.post?.(
      `/companies/${row.userService.companyId}/services/${row.userService.serviceId}/config-request`,
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

  isVideoEditor(row: ServiceRow): boolean {
    return row.service.serviceName === 'Marketing Systems' && !!this._parseObject(row.userService.config)?.['videoEditor'];
  }

  toggleVideoEditor(row: ServiceRow): void {
    row.videoEditorOpen = !row.videoEditorOpen;
    this.groups.update(g => [...g]);
  }

  statusLabel(s: number): string {
    return ['Disabled', 'In Development', 'Live', 'Pending'][s] ?? 'Unknown';
  }

  statusClass(s: number): string {
    return ['status-disabled', 'status-dev', 'status-live', 'status-pending'][s] ?? '';
  }

  hasAnyService(): boolean {
    return this.groups().some(g => g.rows.length > 0);
  }

  private _parseObject(cfg: string): Record<string, any> | null {
    try { return JSON.parse(cfg); } catch { return null; }
  }
}
