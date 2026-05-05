import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ca-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  readonly currentYear = new Date().getFullYear();

  readonly services = [
    { label: 'WhatsApp AI Agent', href: '/services/whatsapp-agent/' },
    { label: 'Quoting & Invoicing', href: '/services/quoting-invoicing/' },
    { label: 'Job Card Automation', href: '/services/job-cards/' },
    { label: 'Custom Workflows', href: '/services/custom/' }
  ];

  readonly company = [
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Contact Us', href: '/contact-us/' },
    { label: 'Crout Holdings', href: 'https://crout-holdings.com', external: true }
  ];
}
