import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { IUserService, IService, IAddon } from '../../../interfaces/i-service.interface';

interface ServiceRow {
  userService: IUserService;
  service:     IService;
  addons:      IAddon[];   // all addons for this service
  activeAddons: string[]; // names already in config
  editing:     boolean;
  editConfig:  string[];
  sidePanelOpen: boolean;
}

@Component({
  selector: 'ca-portal-services',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './portal-services.component.html',
  styleUrls: ['./portal-services.component.scss'],
})
export class PortalServicesComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api  = inject(ApiService);

  readonly user    = computed(() => this.auth.currentUser());
  readonly rows    = signal<ServiceRow[]>([]);
  readonly loading = signal(true);
  readonly saving  = signal<number | null>(null);

  ngOnInit(): void {
    const uid = this.user()?.user_id;
    if (uid == null) { this.loading.set(false); return; }

    this.api.getServices().subscribe(svcs => {
      this.api.getAddons().subscribe(allAddons => {
        this.api.getUserServices(uid).subscribe(us => {
          const built: ServiceRow[] = us.map(u => {
            const svc     = svcs.find(s => s.service_id === u.service_id)!;
            const addons  = allAddons.filter(a => a.service_id === u.service_id);
            const active  = this._parseConfig(u.config);
            return { userService: u, service: svc, addons, activeAddons: active, editing: false, editConfig: [...active], sidePanelOpen: false };
          });
          this.rows.set(built);
          this.loading.set(false);
        });
      });
    });
  }

  private _parseConfig(cfg: string): string[] {
    try { const p = JSON.parse(cfg); return p.integrations ?? []; } catch { return []; }
  }

  startEdit(row: ServiceRow): void {
    row.editing     = true;
    row.editConfig  = [...row.activeAddons];
    this.rows.update(r => [...r]);
  }

  cancelEdit(row: ServiceRow): void {
    row.editing = false;
    this.rows.update(r => [...r]);
  }

  toggleAddon(row: ServiceRow, addonName: string): void {
    const idx = row.editConfig.indexOf(addonName);
    if (idx > -1) row.editConfig.splice(idx, 1);
    else          row.editConfig.push(addonName);
    this.rows.update(r => [...r]);
  }

  isSelected(row: ServiceRow, name: string): boolean {
    return row.editConfig.includes(name);
  }

  submitConfigRequest(row: ServiceRow): void {
    this.saving.set(row.userService.service_id);
    // POST to API (no-op in demo)
    const payload = { integrations: row.editConfig };
    this.api['http']?.post?.(`/users/${this.user()!.user_id}/services/${row.userService.service_id}/config-request`, payload).subscribe?.();
    setTimeout(() => {
      row.activeAddons = [...row.editConfig];
      row.editing      = false;
      this.saving.set(null);
      this.rows.update(r => [...r]);
    }, 800);
  }

  openSidePanel(row: ServiceRow): void {
    row.sidePanelOpen = true;
    this.rows.update(r => [...r]);
  }

  closeSidePanel(row: ServiceRow): void {
    row.sidePanelOpen = false;
    this.rows.update(r => [...r]);
  }

  statusLabel(s: number): string {
    return ['Disabled','In Development','Live','Pending'][s] ?? 'Unknown';
  }

  statusClass(s: number): string {
    return ['status-disabled','status-dev','status-live','status-pending'][s] ?? '';
  }
}
