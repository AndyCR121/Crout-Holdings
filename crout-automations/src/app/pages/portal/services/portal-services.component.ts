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

interface IntegrationItem {
  name: string;
  confirmed: boolean;
  category: 'trigger' | 'action' | 'output';
}

interface ServiceRow {
  userService:   IUserService;
  service:       IService;
  addons:        IAddon[];
  activeAddons:  IntegrationItem[];
  editing:       boolean;
  editAddonIds:  number[];
  editTrigger:   string[];
  editAction:    string[];
  editOutput:    string[];
  triggerNotes:  string;
  actionNotes:   string;
  outputNotes:   string;
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

  readonly integrationOptions = {
    trigger: ['Webhook', 'Email / IMAP', 'WhatsApp Message', 'Website Form', 'Scheduled Trigger'],
    action: ['Xero', 'Google Sheets', 'Trello', 'CRM Update', 'AI Agent', 'Custom Setup'],
    output: ['Email Response', 'WhatsApp Reply', 'Dashboard', 'Report', 'Invoice / Quote']
  };

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
            const active    = this._parseConfig(u.config, allAddons);
            const selectedAddonIds = this._parseAddonIds(u.config, active, rowAddons);
            return {
              userService:   u,
              service:       svc,
              addons:        rowAddons,
              activeAddons:  active,
              editing:       false,
              editAddonIds:  selectedAddonIds,
              editTrigger:   active.filter(i => i.category === 'trigger').map(i => i.name),
              editAction:    active.filter(i => i.category === 'action').map(i => i.name),
              editOutput:    active.filter(i => i.category === 'output').map(i => i.name),
              triggerNotes:  '',
              actionNotes:   '',
              outputNotes:   '',
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

  private _parseConfig(cfg: string | null | undefined, allAddons: IAddon[]): IntegrationItem[] {
    if (!cfg) return [];
    try {
      const parsed = JSON.parse(cfg);
      const raw = parsed.integrations ?? [];
      if (Array.isArray(raw) && raw.length > 0) {
        return raw
          .map((item: any) => typeof item === 'string'
            ? { name: item, confirmed: true, category: this.classifyIntegration(item) }
            : {
                name: String(item.name ?? ''),
                confirmed: item.confirmed === true,
                category: this.asCategory(item.category)
              })
          .filter((item: IntegrationItem) => item.name);
      }

      const addonIds = Array.isArray(parsed.addonIds) ? parsed.addonIds : [];
      return addonIds
        .map((id: number) => allAddons.find(a => a.addonId === id))
        .filter((a: IAddon | undefined): a is IAddon => !!a)
        .map((a: IAddon) => ({ name: a.addonName, confirmed: false, category: this.classifyIntegration(a.addonName) }));
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
  
  private _parseAddonIds(cfg: string | null | undefined, active: IntegrationItem[], rowAddons: IAddon[]): number[] {
    if (cfg) {
      try {
        const parsed = JSON.parse(cfg);
        if (Array.isArray(parsed.addonIds)) return parsed.addonIds;
      } catch { /* fall through */ }
    }
    const selected = new Set(active.map(i => i.name.toLowerCase()));
    return rowAddons.filter(a => selected.has(a.addonName.toLowerCase())).map(a => a.addonId);
  }

  toggleGroup(group: CompanyGroup): void {
    group.expanded = !group.expanded;
    this.groups.update(g => [...g]);
  }

  startEdit(row: ServiceRow): void {
    row.editing = true;
    row.editAddonIds = this._parseAddonIds(row.userService.config, row.activeAddons, row.addons);
    row.editTrigger = row.activeAddons.filter(i => i.category === 'trigger').map(i => i.name);
    row.editAction = row.activeAddons.filter(i => i.category === 'action').map(i => i.name);
    row.editOutput = row.activeAddons.filter(i => i.category === 'output').map(i => i.name);
    this.groups.update(g => [...g]);
  }

  cancelEdit(row: ServiceRow): void {
    row.editing = false;
    this.groups.update(g => [...g]);
  }

  toggleAddon(row: ServiceRow, addon: IAddon): void {
    const idx = row.editAddonIds.indexOf(addon.addonId);
    if (idx > -1) {
      row.editAddonIds.splice(idx, 1);
    } else {
      row.editAddonIds.push(addon.addonId);
      this.addIntegration(row, this.classifyIntegration(addon.addonName), addon.addonName);
    }
    this.groups.update(g => [...g]);
  }

  isSelected(row: ServiceRow, addon: IAddon): boolean {
    return row.editAddonIds.includes(addon.addonId);
  }

  toggleIntegration(row: ServiceRow, category: 'trigger' | 'action' | 'output', name: string): void {
    const list = this.integrationList(row, category);
    const idx = list.indexOf(name);
    if (idx > -1) list.splice(idx, 1);
    else list.push(name);
    this.groups.update(g => [...g]);
  }

  submitConfigRequest(row: ServiceRow): void {
    const userServiceId = row.userService.userServiceId;
    if (userServiceId == null) {
      this.toast.error('Configuration request could not be submitted because this service is missing its assignment id.');
      return;
    }

    this.saving.set(userServiceId);
    this.api.requestServiceConfigChange(userServiceId, {
      addonIds: row.editAddonIds,
      trigger: row.editTrigger,
      action: row.editAction,
      output: row.editOutput,
      triggerNotes: row.triggerNotes,
      actionNotes: row.actionNotes,
      outputNotes: row.outputNotes
    }).subscribe({
      next: updated => {
        row.userService = updated;
        row.activeAddons = this._parseConfig(updated.config, row.addons);
        row.editing = false;
        this.saving.set(null);
        this.groups.update(g => [...g]);
        this.toast.success(`Configuration request submitted for ${row.service.serviceName}.`);
      },
      error: err => {
        this.saving.set(null);
        this.toast.error(err?.error?.error ?? 'Configuration request could not be submitted.');
      }
    });
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
  
  integrationList(row: ServiceRow, category: 'trigger' | 'action' | 'output'): string[] {
    if (category === 'trigger') return row.editTrigger;
    if (category === 'action') return row.editAction;
    return row.editOutput;
  }

  isIntegrationSelected(row: ServiceRow, category: 'trigger' | 'action' | 'output', name: string): boolean {
    return this.integrationList(row, category).includes(name);
  }

  private addIntegration(row: ServiceRow, category: 'trigger' | 'action' | 'output', name: string): void {
    const list = this.integrationList(row, category);
    if (!list.includes(name)) list.push(name);
  }

  private classifyIntegration(name: string): 'trigger' | 'action' | 'output' {
    const lower = name.toLowerCase();
    if (lower.includes('webhook') || lower.includes('email') || lower.includes('whatsapp') || lower.includes('form')) return 'trigger';
    if (lower.includes('report') || lower.includes('dashboard') || lower.includes('output') || lower.includes('invoice')) return 'output';
    return 'action';
  }

  private asCategory(value: string): 'trigger' | 'action' | 'output' {
    return value === 'trigger' || value === 'output' ? value : 'action';
  }
}
