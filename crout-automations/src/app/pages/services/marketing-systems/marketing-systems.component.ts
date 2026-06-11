import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CtaBannerComponent } from '../../../components/cta-banner/cta-banner.component';
import { ScrollRevealDirective } from '../../../directives/scroll-reveal.directive';
import { SafeHtmlPipe } from '../../../pipes/safe-html.pipe';
import { ApiService } from '../../../services/api.service';
import { ServiceConfiguratorComponent } from '../../../components/service-configurator/service-configurator.component';
import { IService, IAddon, IPackage } from '../../../interfaces/i-service.interface';

const SERVICE_NAME = 'Marketing Systems';

@Component({
  selector: 'ca-marketing-systems',
  standalone: true,
  imports: [CommonModule, RouterModule, CtaBannerComponent, ScrollRevealDirective, SafeHtmlPipe, ServiceConfiguratorComponent],
  templateUrl: './marketing-systems.component.html',
  styleUrl: './marketing-systems.component.scss'
})
export class MarketingSystemsComponent implements OnInit {

  private api = inject(ApiService);

  loading = signal<boolean>(true);
  service = signal<IService | null>(null);
  addons = signal<IAddon[]>([]);
  packages = signal<IPackage[]>([]);
  allServices = signal<IService[]>([]);

  readonly subServiceIcons: Record<string, string> = {
    'Branded Image Generation': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    'Faceless & Face Videos': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
    'All Social Platforms': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
    'Weekly Scheduling': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    'SEO & Analytics': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    'After-Hours Receptionist': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.44 2 2 0 0 1 3.57 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.4a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
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
    { num: '01', title: 'Content Brief', desc: 'You provide a brief or brand kit — or we handle the whole content strategy for you.' },
    { num: '02', title: 'AI Creates', desc: 'Images, videos, and copy are generated on schedule, tailored to your brand voice and audience.' },
    { num: '03', title: 'Auto-Schedule', desc: 'Content is pushed to your channels on the optimal schedule — no manual uploads needed.' },
    { num: '04', title: 'Track & Optimise', desc: 'Analytics feed back into the system so future content improves based on what performs.' }
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
      console.error(err?.message ?? err ?? 'MarketingSystemsComponent onLoad() failed');
    } finally {
      this.loading.set(false);
    }
  }
}
