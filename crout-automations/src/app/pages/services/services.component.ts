import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CtaBannerComponent } from '../../components/cta-banner/cta-banner.component';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';
import { ApiService } from '../../services/api.service';
import { IService } from '../../interfaces/i-service.interface';
import { IServiceDisplay, ServiceAccent } from '../../interfaces/i-service-display.interface';

/** Static display metadata keyed by ServiceName — preserved from original design */
const SERVICE_META: Record<string, Omit<IServiceDisplay, keyof IService>> = {
  'Quote System': {
    slug: 'quote-system',
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    label: 'Quote & Invoice System',
    tagline: 'From enquiry to invoice — fully automated.',
    features: ['Xero Integration', 'Multi-Platform Accounting', 'Custom Calculations', 'Auto Invoice Follow-Ups', 'Quote-to-Invoice Pipeline', 'Smart Summaries'],
    accent: 'orange',
  },
  'WhatsApp Agent': {
    slug: 'whatsapp-agent',
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
    label: 'WhatsApp AI Agent',
    tagline: 'Your business, always available on WhatsApp.',
    features: ['Client Support', 'Team Notifications', 'Client Notifications', 'Quote Gathering & Generation', 'Marketing Reach', 'Custom Flows'],
    accent: 'blue',
  },
  'Project Management System': {
    slug: 'project-management',
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    label: 'Project Management',
    tagline: 'Cards created. Teams notified. Progress tracked.',
    features: ['Auto Trello Card Creation', 'Trello Board Management', 'Jira Integration', 'Custom Trigger Workflows', 'Team Notifications', 'Custom Systems'],
    accent: 'orange',
  },
  'Marketing Systems': {
    slug: 'marketing-systems',
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
    label: 'Marketing Systems',
    tagline: 'Content on autopilot. Results on the dashboard.',
    features: ['Branded Image Generation', 'Faceless & Face Videos', 'All Social Platforms', 'Weekly Scheduling', 'SEO & Analytics', 'After-Hours Receptionist'],
    accent: 'blue',
  },
};

@Component({
  selector: 'ca-services',
  standalone: true,
  imports: [CommonModule, RouterModule, CtaBannerComponent, ScrollRevealDirective, SafeHtmlPipe],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss'
})
export class ServicesComponent implements OnInit {

  private api = inject(ApiService);

  ghostLoaderOnLoad = signal<boolean>(true);

  services: IServiceDisplay[] = [];

  /** Ghost skeletons — 4 cards matching expected service count */
  skeletonCards = Array(4).fill(null);

  ngOnInit(): void {
    this.onLoad();
  }

  async onLoad(): Promise<void> {
    try {
      const resp = await this.api.getServices().toPromise();
      if (resp) {
        this.services = resp
          .filter(s => !s.Conditional)           // hide conditional services
          .map((s, i) => {
            const meta = SERVICE_META[s.ServiceName];
            const accent: ServiceAccent = i % 2 === 0 ? 'orange' : 'blue';
            return {
              ...s,
              slug:     meta?.slug     ?? s.ServiceName.toLowerCase().replace(/\s+/g, '-'),
              icon:     meta?.icon     ?? '',
              label:    meta?.label    ?? s.ServiceName,
              tagline:  meta?.tagline  ?? s.ServiceDescription,
              features: meta?.features ?? [],
              accent:   meta?.accent   ?? accent,
            } as IServiceDisplay;
          });
        this.ghostLoaderOnLoad.set(false);
      }
    } catch (error: any) {
      console.error(
        error ? (error.message ?? error.error ?? error) : 'Something went wrong onLoad()!'
      );
    }
  }
}
