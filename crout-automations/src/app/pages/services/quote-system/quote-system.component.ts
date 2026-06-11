import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CtaBannerComponent } from '../../../components/cta-banner/cta-banner.component';
import { ScrollRevealDirective } from '../../../directives/scroll-reveal.directive';
import { SafeHtmlPipe } from '../../../pipes/safe-html.pipe';
import { ApiService } from '../../../services/api.service';
import { ServiceConfiguratorComponent } from '../../../components/service-configurator/service-configurator.component';
import { IService, IAddon, IPackage } from '../../../interfaces/i-service.interface';

const SERVICE_NAME = 'Quote System';

@Component({
  selector: 'ca-quote-system',
  standalone: true,
  imports: [CommonModule, RouterModule, CtaBannerComponent, ScrollRevealDirective, SafeHtmlPipe, ServiceConfiguratorComponent],
  templateUrl: './quote-system.component.html',
  styleUrl: './quote-system.component.scss'
})
export class QuoteSystemComponent implements OnInit {

  private api = inject(ApiService);

  loading = signal<boolean>(true);
  service = signal<IService | null>(null);
  addons = signal<IAddon[]>([]);
  packages = signal<IPackage[]>([]);
  allServices = signal<IService[]>([]);

  readonly subServiceIcons: Record<string, string> = {
    'Xero Integration': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
    'Multi-Platform Accounting': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
    'Custom Calculations': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/></svg>`,
    'Auto Invoice Follow-Ups': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    'Quote-to-Invoice Pipeline': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    'Smart Summaries': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>`,
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
    { num: '01', title: 'Trigger', desc: 'Client submits an enquiry via form, WhatsApp, or email — the system captures all details automatically.' },
    { num: '02', title: 'Calculate', desc: 'Pricing rules, formulas, and product data are applied. A quote is generated with full line-item breakdown.' },
    { num: '03', title: 'Deliver', desc: 'The branded quote is sent to the client via their preferred channel — PDF, email, or WhatsApp.' },
    { num: '04', title: 'Convert & Follow Up', desc: 'On approval, the quote becomes an invoice instantly. Unpaid invoices trigger follow-up reminders automatically.' }
  ];

  ngOnInit(): void { this.onLoad(); }

  async onLoad(): Promise<void> {
    try {
      const allSvcs = await this.api.getServices().toPromise();
      this.allServices.set(allSvcs ?? []);
      const raw = allSvcs?.find(s => s.ServiceName === SERVICE_NAME);
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
      console.error(err?.message ?? err ?? 'QuoteSystemComponent onLoad() failed');
    } finally {
      this.loading.set(false);
    }
  }
}
