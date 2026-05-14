import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ch-contact-cta',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contact-cta.component.html',
  styleUrl: './contact-cta.component.scss'
})
export class ContactCtaComponent {
  /** WordPress: pass the full URL to your Contact Us page */
  @Input() contactUrl: string = '/contact-us';
}
