import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CtaBannerComponent } from '../../../components/cta-banner/cta-banner.component';
import { ScrollRevealDirective } from '../../../directives/scroll-reveal.directive';
import { SafeHtmlPipe } from '../../../pipes/safe-html.pipe';
import { ApiService } from '../../../services/api.service';
import { ServiceConfiguratorComponent } from '../../../components/service-configurator/service-configurator.component';
import { IService, IAddon, IPackage } from '../../../interfaces/i-service.interface';

const SERVICE_NAME = 'Project Management System';

@Component({
  selector: 'ca-project-management',
  standalone: true,
  imports: [CommonModule, RouterModule, CtaBannerComponent, ScrollRevealDirective, SafeHtmlPipe, ServiceConfiguratorComponent],
  templateUrl: './project-management.component.html',
  styleUrl: './project-management.component.scss'
})
export class ProjectManagementComponent implements OnInit {

  private api = inject(ApiService);

  loading = signal<boolean>(true);
  service = signal<IService | null>(null);
  addons = signal<IAddon[]>([]);
  packages = signal<IPackage[]>([]);
  allServices = signal<IService[]>([]);

  readonly subServiceIcons: Record<string, string> = {
    'Auto Trello Card Creation': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    'Trello Board Management': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
    'Jira Integration': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
    'Custom Trigger Workflows': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>`,
    'Team Notifications': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    'Custom Systems': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  };

  readonly defaultIcon = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  subServices = computed(() => {
    const svc = this.service();
    if (!svc) return [];
    return (svc.features ?? []).map(f => ({
      icon: this.subServiceIcons[f] ?? this.defaultIcon,
      title: f,
    }));
  });

  steps = [
    { num: '01', title: 'Trigger Fires', desc: 'An email, webhook, WhatsApp message, or form submission triggers the job card creation flow.' },
    { num: '02', title: 'Card Created', desc: 'A structured Trello card (or Jira ticket) is created instantly, populated with all relevant data.' },
    { num: '03', title: 'Team Notified', desc: 'The right team member is assigned and notified via WhatsApp with a direct link to the card.' },
    { num: '04', title: 'Progress Tracked', desc: 'As the card moves through stages, automated updates are sent to the client and management.' }
  ];

  ngOnInit(): void { this.onLoad(); }

  async onLoad(): Promise<void> {
    try {
      const allSvcs = await this.api.getServices().toPromise();
      this.allServices.set(allSvcs ?? []);
      const raw = allSvcs?.find(s => s.serviceName === SERVICE_NAME);
      if (raw) {
        const [addons, pkgs] = await Promise.all([
          this.api.getAddonsByService(raw.service_id).toPromise(),
          this.api.getPackagesByService(raw.service_id).toPromise(),
        ]);
        this.addons.set(addons ?? []);
        this.packages.set(pkgs ?? []);
        this.service.set(raw);
      }
    } catch (err: any) {
      console.error(err?.message ?? err ?? 'ProjectManagementComponent onLoad() failed');
    } finally {
      this.loading.set(false);
    }
  }
}
