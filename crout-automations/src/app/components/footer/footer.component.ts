import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'ca-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  currentYear = new Date().getFullYear();

  services = [
    { label: 'WhatsApp Agent',                route: '/services' },
    { label: 'Quote Automation',              route: '/services' },
    { label: 'Job Card Automation',           route: '/services' },
    { label: 'Lead Capture & CRM Sync',       route: '/services' },
    { label: 'Invoice & Payment Workflows',   route: '/services' },
    { label: 'AI Agent Workflows',            route: '/services' },
  ];

  navLinks = [
    { label: 'Home',       route: '/' },
    { label: 'Services',   route: '/services' },
    { label: 'FAQ',        route: '/faq' },
    { label: 'Contact Us', route: '/contact-us' },
  ];
}
