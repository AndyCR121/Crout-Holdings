import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeHeroComponent } from '../../components/home-hero/home-hero.component';
import { WhatWeDoComponent } from '../../components/what-we-do/what-we-do.component';
import { DivisionCardsComponent } from '../../components/division-cards/division-cards.component';
import { WhoWeAreComponent } from '../../components/who-we-are/who-we-are.component';
import { ContactCtaComponent } from '../../components/contact-cta/contact-cta.component';

@Component({
  selector: 'ch-home-page',
  standalone: true,
  imports: [
    CommonModule,
    HomeHeroComponent,
    WhatWeDoComponent,
    DivisionCardsComponent,
    WhoWeAreComponent,
    ContactCtaComponent,
  ],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss'
})
export class HomePageComponent {
  /**
   * WordPress: pass the full base URL for assets,
   * e.g. https://example.com/wp-content/themes/crout/crout-elements/assets/
   * Matches the same pattern as ch-privacy-policy.
   */
  @Input() assetsBase: string = '/assets/';

  /** WordPress: pass the URL to the divisions page */
  @Input() divisionsUrl: string = '/divisions';

  /** WordPress: pass the URL to the contact page */
  @Input() contactUrl: string = '/contact-us';
}
