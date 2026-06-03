import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CtaBannerComponent } from '../../components/cta-banner/cta-banner.component';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';

@Component({
  selector: 'ca-services',
  standalone: true,
  imports: [CommonModule, RouterModule, CtaBannerComponent, ScrollRevealDirective, SafeHtmlPipe],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss'
})
export class ServicesComponent {
  services = [
    {
      slug: 'quote-system',
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
      label: 'Quote & Invoice System',
      tagline: 'From enquiry to invoice — fully automated.',
      description: 'Generate accurate quotes integrated with Xero or your accounting platform, auto-calculate complex pricing, and follow up on outstanding invoices — without lifting a finger.',
      features: ['Xero Integration', 'Multi-Platform Accounting', 'Custom Calculations', 'Auto Invoice Follow-Ups', 'Quote-to-Invoice Pipeline', 'Smart Summaries'],
      accent: 'orange'
    },
    {
      slug: 'whatsapp-agent',
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
      label: 'WhatsApp AI Agent',
      tagline: 'Your business, always available on WhatsApp.',
      description: 'Deploy an AI agent that handles client support, sends team and client notifications, gathers quote details, and markets to your client base — all via WhatsApp, 24/7.',
      features: ['Client Support', 'Team Notifications', 'Client Notifications', 'Quote Gathering & Generation', 'Marketing Reach', 'Custom Flows'],
      accent: 'blue'
    },
    {
      slug: 'project-management',
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
      label: 'Project Management',
      tagline: 'Cards created. Teams notified. Progress tracked.',
      description: 'Automatically create Trello cards, manage full Trello or Jira project boards, and keep your team in sync — triggered by client actions, forms, or your own workflows.',
      features: ['Auto Trello Card Creation', 'Trello Board Management', 'Jira Integration', 'Custom Trigger Workflows', 'Team Notifications', 'Custom Systems'],
      accent: 'orange'
    },
    {
      slug: 'marketing-systems',
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
      label: 'Marketing Systems',
      tagline: 'Content on autopilot. Results on the dashboard.',
      description: 'AI-generated branded images, faceless & face-synced videos, auto-scheduled across all platforms weekly, with SEO optimisation and performance analytics — plus an after-hours AI receptionist.',
      features: ['Branded Image Generation', 'Faceless & Face Videos', 'All Social Platforms', 'Weekly Scheduling', 'SEO & Analytics', 'After-Hours Receptionist'],
      accent: 'blue'
    }
  ];
}
