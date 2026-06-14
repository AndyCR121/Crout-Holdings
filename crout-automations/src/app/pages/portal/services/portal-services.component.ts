import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { IUserService, IService, ICompany } from '../../../interfaces/i-service.interface';
import { CompanySvcFilterPipe } from '../../../pipes/company-svc-filter.pipe';
import { PortalLeftMenuComponent } from '../../../components/left-menu/portal-left-menu.component';

@Component({
  selector: 'ca-portal-services',
  standalone: true,
  imports: [CommonModule, CompanySvcFilterPipe, PortalLeftMenuComponent],
  templateUrl: './portal-services.component.html',
  styleUrls: ['./portal-services.component.scss'],
})
export class PortalServicesComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api  = inject(ApiService);

  readonly user         = computed(() => this.auth.currentUser());
  readonly companies    = signal<ICompany[]>([]);
  readonly userServices = signal<IUserService[]>([]);
  readonly allServices  = signal<IService[]>([]);
  readonly loading      = signal(true);

  ngOnInit(): void {
    const uid = this.user()?.userId;
    if (uid == null) { this.loading.set(false); return; }
    this.api.getServices().subscribe(svcs => {
      this.allServices.set(svcs);
      this.api.getCompaniesByUser(uid).subscribe(companies => {
        this.companies.set(companies);
        this.loading.set(false);
      });
    });
  }

  getService(id: number): IService | undefined {
    return this.allServices().find(s => s.serviceId === id);
  }

  getCompany(id: number): ICompany | undefined {
    return this.companies().find(c => c.companyId === id);
  }

  statusLabel(s: number): string {
    return ['Disabled', 'In Development', 'Live', 'Pending'][s] ?? 'Unknown';
  }

  statusClass(s: number): string {
    return ['status-disabled', 'status-dev', 'status-live', 'status-pending'][s] ?? '';
  }
}
