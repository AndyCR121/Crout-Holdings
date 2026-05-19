import { Component, HostBinding, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface DivisionStatus {
  name: string;
  description: string;
  available: boolean;
}

@Component({
  selector: 'ch-who-we-are',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './who-we-are.component.html',
  styleUrl: './who-we-are.component.scss'
})
export class WhoWeAreComponent {
  @HostBinding('id') readonly hostId = 'who-we-are';
  @Input() assetsBase: string = '/assets/';

  get whoBg(): string {
    const filename = encodeURIComponent('Crout Holdings Luxury Logo_Grey.png');
    return `${this.assetsBase}${filename}`;
  }

  readonly divisions: DivisionStatus[] = [
    {
      name: 'Admin Automations',
      description: 'Intelligent workflow automation & custom business bots.',
      available: true
    },
    {
      name: 'Property Rentals',
      description: 'Townhouse, house & real estate rental management.',
      available: false
    },
    {
      name: 'Car Washing & Detailing',
      description: 'On-site & mobile car washing and full detailing services.',
      available: false
    },
    {
      name: 'SAAS Division',
      description: 'Subscription-based mobile apps & software consoles.',
      available: false
    },
  ];
}
