import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

export interface AddOn {
  name: string;
  price: number;
}

export interface Service {
  name: string;
  popular?: boolean;
  basePrice: number;
  basePriceLabel?: string;
  desc: string;
  includes: string[];
  addOns: AddOn[];
  ctaLabel: string;
  ctaHref: string;
  highlight?: boolean;
}

@Component({
  selector: 'ca-pricing',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss'
})
export class PricingComponent {

  readonly PACKAGE_DISCOUNT = 0.25;

  services: Service[] = [
    {
      name: 'WhatsApp Agent',
      popular: true,
      highlight: true,
      basePrice: 6000,
      desc: 'A flexible WhatsApp Agent that handles enquiries, automates quotes, creates job cards, and manages client comms — pick exactly what you need.',
      includes: [
        'Base WhatsApp Agent',
        '2M Tokens included',
        'Smart Client Support',
      ],
      addOns: [
        { name: 'Marketing Messaging', price: 800 },
        { name: 'Automated Quoting [Xero]', price: 1200 },
        { name: '5M+ Token Upgrade', price: 600 },
        { name: 'Template/Forms Messaging', price: 500 },
      ],
      ctaLabel: 'Choose Plan',
      ctaHref: '/contact-us/',
    },
    {
      name: 'Automated Quotes',
      basePrice: 6000,
      desc: 'End-to-end quote automation — triggered by email, webhook, or WhatsApp, linked to Xero, and approved by the right person automatically.',
      includes: [
        'Email/Webhook Trigger',
        'Xero-Linked Quotes',
        'Responsible Manager Confirmation',
        'Smart Agent Management',
        'WhatsApp/Telegram Integration',
      ],
      addOns: [],
      ctaLabel: 'Choose Plan',
      ctaHref: '/contact-us/',
    },
    {
      name: 'Automated Job Cards',
      basePrice: 6000,
      desc: 'Auto-generate job cards from any trigger — email, webhook, or WhatsApp — synced with Trello and managed by AI agents.',
      includes: [
        'Email/Webhook/WhatsApp Trigger',
        'Trello Integration',
        'Smart Agent Management',
        'Template Based',
        'WhatsApp/Telegram Integration',
      ],
      addOns: [],
      ctaLabel: 'Choose Plan',
      ctaHref: '/contact-us/',
    },
  ];

  packageAddOns: AddOn[] = [
    { name: 'Marketing Messaging', price: 800 },
    { name: 'Automated Quoting [Xero]', price: 1200 },
    { name: '5M+ Token Upgrade', price: 600 },
    { name: 'Template/Forms Messaging', price: 500 },
  ];

  get packageFullPrice(): number {
    return this.packageAddOns.reduce((sum, a) => sum + a.price, 0);
  }

  get packageDiscountedPrice(): number {
    return Math.round(this.packageFullPrice * (1 - this.PACKAGE_DISCOUNT));
  }

  get packageSaving(): number {
    return this.packageFullPrice - this.packageDiscountedPrice;
  }

  formatPrice(n: number): string {
    return n.toLocaleString('en-ZA');
  }
}
