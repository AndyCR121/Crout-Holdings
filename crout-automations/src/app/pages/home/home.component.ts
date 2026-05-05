import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavComponent } from '../../components/nav/nav.component';
import { HeroComponent } from '../../components/hero/hero.component';
import { PainPointComponent } from '../../components/pain-point/pain-point.component';
import { ServicesOverviewComponent } from '../../components/services-overview/services-overview.component';
import { HowItWorksComponent } from '../../components/how-it-works/how-it-works.component';
import { WhyCroutComponent } from '../../components/why-crout/why-crout.component';
import { PricingComponent } from '../../components/pricing/pricing.component';
import { CtaBannerComponent } from '../../components/cta-banner/cta-banner.component';
import { FooterComponent } from '../../components/footer/footer.component';

@Component({
  selector: 'ca-home',
  standalone: true,
  imports: [
    CommonModule,
    NavComponent,
    HeroComponent,
    PainPointComponent,
    ServicesOverviewComponent,
    HowItWorksComponent,
    WhyCroutComponent,
    PricingComponent,
    CtaBannerComponent,
    FooterComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {}
