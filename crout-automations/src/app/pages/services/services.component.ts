import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ServicesOverviewComponent } from '../../components/services-overview/services-overview.component';
import { PricingComponent } from '../../components/pricing/pricing.component';
import { CtaBannerComponent } from '../../components/cta-banner/cta-banner.component';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

@Component({
  selector: 'ca-services',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ServicesOverviewComponent,
    PricingComponent,
    CtaBannerComponent,
    ScrollRevealDirective
  ],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss'
})
export class ServicesComponent {}
