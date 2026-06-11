import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CtaBannerComponent } from '../../../components/cta-banner/cta-banner.component';
import { ScrollRevealDirective } from '../../../directives/scroll-reveal.directive';
import { SafeHtmlPipe } from '../../../pipes/safe-html.pipe';
import { ApiService } from '../../../services/api.service';
import { ServiceConfiguratorComponent } from '../../../components/service-configurator/service-configurator.component';
import { IService, IAddon, IPackage } from '../../../interfaces/i-service.interface';

const SERVICE_NAME = 'WhatsApp Agent';

@Component({
  selector: 'ca-whatsapp-agent',
  standalone: true,
  imports: [CommonModule, RouterModule, CtaBannerComponent, ScrollRevealDirective, SafeHtmlPipe, ServiceConfiguratorComponent],
  templateUrl: './whatsapp-agent.component.html',
  styleUrl: './whatsapp-agent.component.scss'
})
export class WhatsappAgentComponent implements OnInit {

  private api = inject(ApiService);

  loading = signal<boolean>(true);
  service = signal<IService | null>(null);
  addons = signal<IAddon[]>([]);
  packages = signal<IPackage[]>([]);
  allServices = signal<IService[]>([]);

  /** Features from API mapped to display sub-service blocks */
  readonly subServiceIcons: Record<string, string> = {
    'Client Support': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    'Team Notifications': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    'Client Notifications': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.44 2 2 0 0 1 3.57 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.4a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    'Quote Gathering & Generation': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>`,
    'Marketing Reach': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
    'Custom Flows': `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>`,
  };

  readonly defaultIcon = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  /** Derived from service.features — the API is the single source of truth */
  subServices = computed(() => {
    const svc = this.service();
    if (!svc) return [];
    return (svc.features ?? []).map(f => ({
      icon: this.subServiceIcons[f] ?? this.defaultIcon,
      title: f,
    }));
  });

  steps = [
    { num: '01', title: 'Event Triggers', desc: 'A client message, form submission, payment, or internal event fires the automation.' },
    { num: '02', title: 'AI Processes', desc: 'The agent interprets the message, queries your data, and formulates the right response or action.' },
    { num: '03', title: 'WhatsApp Delivers', desc: 'A branded, contextual message is sent to the client or team member via WhatsApp instantly.' },
    { num: '04', title: 'Loop Closes', desc: 'Replies are captured, follow-up flows triggered, and the conversation history is stored for context.' }
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
      console.error(err?.message ?? err ?? 'WhatsappAgentComponent onLoad() failed');
    } finally {
      this.loading.set(false);
    }
  }
}
