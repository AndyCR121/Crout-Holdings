import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ch-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  @Input() assetsBase: string = '/assets/';
  @Input() contactUrl: string = '/contact-us/';

  readonly currentYear = new Date().getFullYear();

  readonly divisions = [
    { label: 'Automations', href: 'https://automations.crout-holdings.com/' },
    { label: 'Security', href: '/divisions/security/' },
    { label: 'Properties', href: '/divisions/properties/' },
    { label: 'Auto', href: '/divisions/auto/' },
    { label: 'SaaS', href: '/divisions/saas/' },
  ];

  readonly company = [
    { label: 'About Us', href: '/about/' },
    { label: 'Contact', href: '/contact-us/' },
    { label: 'Privacy Policy', href: '/privacy-policy/' },
  ];
}
