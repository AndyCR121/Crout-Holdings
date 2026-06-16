import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

export interface ServiceCard {
  title: string;
  body: string;
  icon: SafeHtml;
}

@Component({
  selector: 'ca-services-overview',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  templateUrl: './services-overview.component.html',
  styleUrl: './services-overview.component.scss'
})
export class ServicesOverviewComponent {

  services: ServiceCard[];

  constructor(private sanitizer: DomSanitizer) {
    const raw: { title: string; body: string; icon: string }[] = [
      {
        title: 'Lead Capture & CRM Sync',
        body: 'Every form submission, enquiry, and social lead lands straight in your CRM — tagged, assigned, and followed up automatically.',
        icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
      },
      {
        title: 'Invoice & Payment Workflows',
        body: 'Quotes become invoices. Invoices chase themselves. Payments trigger receipts. Your finance admin runs on autopilot.',
        icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>'
      },
      {
        title: 'Client Onboarding',
        body: 'New client signs — they get a welcome email, an onboarding checklist, and their folder created in the right place. Zero manual steps.',
        icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
      },
      {
        title: 'Reporting & Dashboards',
        body: 'Weekly reports compiled and emailed automatically. Live dashboards pulling from your actual data sources — no spreadsheet gymnastics.',
        icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>'
      },
      {
        title: 'Internal Notifications & Alerts',
        body: 'Your team gets notified on Slack, WhatsApp, or email the moment something needs attention — no more missed tasks.',
        icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>'
      },
      {
        title: 'AI Agent Workflows',
        body: 'GPT-powered agents that summarise emails, draft responses, extract data from documents, and make decisions — built for your business logic.',
        icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
      }
    ];

    this.services = raw.map(s => ({
      ...s,
      icon: this.sanitizer.bypassSecurityTrustHtml(s.icon)
    }));
  }
}
