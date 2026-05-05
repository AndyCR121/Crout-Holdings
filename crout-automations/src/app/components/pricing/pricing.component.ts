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
  highlight?: boolean;
  basePrice: number;
  desc: string;
  includes: string[];
  addOns: AddOn[];
  bundleDeal?: boolean;
  ctaLabel: string;
  ctaHref: string;
}

export interface XeroSuiteAddOn {
  label: string;
  price: number;
}

export interface XeroSuiteItem {
  label: string;
  price: number;
  optional?: boolean;
  addOns?: XeroSuiteAddOn[];
}

@Component({
  selector: 'ca-pricing',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss'
})
export class PricingComponent {

  readonly PACKAGE_DISCOUNT        = 0.15;
  readonly SUITE_DISCOUNT_BASE     = 0.15;  // without WhatsApp
  readonly SUITE_DISCOUNT_WHATSAPP = 0.20;  // with WhatsApp

  xeroSuiteWhatsApp = false;

  services: Service[] = [
    {
      name: 'WhatsApp Agent',
      popular: true,
      highlight: true,
      basePrice: 6000,
      bundleDeal: true,
      desc: 'A flexible WhatsApp Agent that handles enquiries, automates quotes, creates job cards, and manages client comms — pick exactly what you need.',
      includes: [
        'Base WhatsApp Agent',
        '2M Tokens included',
        'Smart Client Support',
      ],
      addOns: [
        { name: 'Marketing Messaging',        price: 800  },
        { name: 'Automated Quoting [Xero]',   price: 1200 },
        { name: '5M+ Token Upgrade',          price: 600  },
        { name: 'Template/Forms Messaging',   price: 500  },
      ],
      ctaLabel: 'Choose Plan',
      ctaHref: '/contact-us/',
    },
    {
      name: 'Automated Quotes',
      basePrice: 6000,
      bundleDeal: true,
      desc: 'End-to-end quote automation — triggered by email, webhook, or WhatsApp, linked to Xero, and approved by the right person automatically.',
      includes: [
        'Email/Webhook Trigger',
        'Xero-Linked Quotes',
        'Responsible Manager Confirmation',
        'Smart Agent Management',
        'WhatsApp/Telegram Integration',
      ],
      addOns: [
        { name: 'Xero Invoices',              price: 800 },
        { name: 'Invoice Follow-Ups [Xero]',  price: 600 },
      ],
      ctaLabel: 'Choose Plan',
      ctaHref: '/contact-us/',
    },
    {
      name: 'Automated Job Cards',
      basePrice: 6000,
      bundleDeal: true,
      desc: 'Auto-generate job cards from any trigger — email, webhook, or WhatsApp — synced with Trello and managed by AI agents.',
      includes: [
        'Email/Webhook/WhatsApp Trigger',
        'Trello Integration',
        'Smart Agent Management',
        'Template Based',
        'WhatsApp/Telegram Integration',
      ],
      addOns: [
        { name: 'Custom Setup',               price: 1000 },
        { name: 'Payroll Excel Generation',   price: 900  },
      ],
      ctaLabel: 'Choose Plan',
      ctaHref: '/contact-us/',
    },
  ];

  readonly xeroSuiteItems: XeroSuiteItem[] = [
    { label: 'Automated Quotes',          price: 6000 },
    { label: 'Xero Invoices',             price: 800  },
    { label: 'Invoice Follow-Ups [Xero]', price: 600  },
    { label: 'Automated Job Cards',       price: 6000 },
    { label: 'Payroll Excel Generation',  price: 900  },
    {
      label: 'WhatsApp Agent Service',
      price: 6000,
      optional: true,
      addOns: [
        { label: 'Marketing Messaging',       price: 800  },
        { label: 'Automated Quoting [Xero]',  price: 1200 },
        { label: '5M+ Token Upgrade',         price: 600  },
        { label: 'Template/Forms Messaging',  price: 500  },
      ],
    },
  ];

  get suiteDiscount(): number {
    return this.xeroSuiteWhatsApp
      ? this.SUITE_DISCOUNT_WHATSAPP
      : this.SUITE_DISCOUNT_BASE;
  }

  get xeroSuiteFullPrice(): number {
    let total = 0;
    for (const item of this.xeroSuiteItems) {
      if (item.optional && !this.xeroSuiteWhatsApp) continue;
      total += item.price;
      if (item.optional && this.xeroSuiteWhatsApp && item.addOns) {
        total += item.addOns.reduce((s, a) => s + a.price, 0);
      }
    }
    return total;
  }

  get xeroSuiteDiscountedPrice(): number {
    return Math.round(this.xeroSuiteFullPrice * (1 - this.suiteDiscount));
  }

  get xeroSuiteSaving(): number {
    return this.xeroSuiteFullPrice - this.xeroSuiteDiscountedPrice;
  }

  toggleXeroWhatsApp(): void {
    this.xeroSuiteWhatsApp = !this.xeroSuiteWhatsApp;
  }

  bundleFullPrice(svc: Service): number {
    return svc.basePrice + svc.addOns.reduce((sum, a) => sum + a.price, 0);
  }

  bundleDiscountedPrice(svc: Service): number {
    return Math.round(this.bundleFullPrice(svc) * (1 - this.PACKAGE_DISCOUNT));
  }

  bundleSaving(svc: Service): number {
    return this.bundleFullPrice(svc) - this.bundleDiscountedPrice(svc);
  }

  formatPrice(n: number): string {
    return n.toLocaleString('en-ZA');
  }
}
