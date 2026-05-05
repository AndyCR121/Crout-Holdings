import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

@Component({
  selector: 'ca-cta-banner',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  templateUrl: './cta-banner.component.html',
  styleUrl: './cta-banner.component.scss'
})
export class CtaBannerComponent {}
