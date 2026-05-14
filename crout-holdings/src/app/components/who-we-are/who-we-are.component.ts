import { Component, HostBinding } from '@angular/core';
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

  readonly divisions: DivisionStatus[] = [
    {
      name: 'Admin Automations',
      description: 'Intelligent workflow automation & custom business bots.',
      available: true
    },
    {
      name: 'Alarm System Installations',
      description: 'Sub-contracting security alarm installations.',
      available: false
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
