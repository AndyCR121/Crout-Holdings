import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Division {
  name: string;
  /** background image for the card top — supply full URL or relative asset path */
  bgImage: string;
  /** logo image for the card top */
  logo: string;
  /** link to the division site */
  siteUrl: string;
  /** scrolling services list */
  services: string[];
  available: boolean;
}

@Component({
  selector: 'ch-division-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './division-cards.component.html',
  styleUrl: './division-cards.component.scss'
})
export class DivisionCardsComponent {
  @Input() assetsBase: string = '/assets/';

  get divisions(): Division[] {
    const b = this.assetsBase;
    return [
      {
        name: 'Crout Automations',
        bgImage: `${b}n8n-workflow-generated.png`,
        logo: `${b}Crout Automations Logo.png`,
        siteUrl: 'https://automations.crout-holdings.com',
        available: true,
        services: [
          'Admin Workflow Automation',
          'Custom WhatsApp Bots',
          'Document Generation',
          'Business Process Automation',
          'CRM Integration',
          'Reporting & Dashboards',
        ]
      },
      {
        name: 'Crout Security',
        bgImage: `${b}camera-generated.png`,
        logo: `${b}divisions/security-logo.png`,
        siteUrl: '#',
        available: false,
        services: [
          'Alarm System Installations',
          'Sub-Contracting Services',
          'Security Assessments',
          'Residential Security',
          'Commercial Security',
        ]
      },
      {
        name: 'Crout Properties',
        bgImage: `${b}home-generated.png`,
        logo: `${b}divisions/properties-logo.png`,
        siteUrl: '#',
        available: false,
        services: [
          'Townhouse Rentals',
          'House Rentals',
          'Real Estate Listings',
          'Property Management',
          'Tenant Services',
        ]
      },
      {
        name: 'Crout Auto',
        bgImage: `${b}car-wash-generated.png`,
        logo: `${b}divisions/auto-logo.png`,
        siteUrl: '#',
        available: false,
        services: [
          'Car Washing',
          'Car Detailing',
          'Mobile Car Washing',
          'Mobile Car Detailing',
          'Interior Deep Cleans',
          'Paint Protection',
        ]
      },
      {
        name: 'Crout SAAS',
        bgImage: `${b}code-generated.png`,
        logo: `${b}divisions/saas-logo.png`,
        siteUrl: '#',
        available: false,
        services: [
          'Mobile App Development',
          'SaaS Subscription Platforms',
          'Admin Console Development',
          'Custom Software Solutions',
          'API Development',
        ]
      },
    ];
  }
}
