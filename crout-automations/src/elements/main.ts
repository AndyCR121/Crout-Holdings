/**
 * Angular Elements entry point.
 * Each component is registered as a native Custom Element.
 *
 * Build command:
 *   ng build --configuration elements
 *
 * Drop-in WordPress usage:
 *   <script src="crout-automations.js"></script>
 *   <ca-hero></ca-hero>
 *   <ca-pricing></ca-pricing>
 *   ... etc
 */
import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { NavComponent } from '../app/components/nav/nav.component';
import { HeroComponent } from '../app/components/hero/hero.component';
import { PainPointComponent } from '../app/components/pain-point/pain-point.component';
import { ServicesOverviewComponent } from '../app/components/services-overview/services-overview.component';
import { HowItWorksComponent } from '../app/components/how-it-works/how-it-works.component';
import { WhyCroutComponent } from '../app/components/why-crout/why-crout.component';
import { PricingComponent } from '../app/components/pricing/pricing.component';
import { CtaBannerComponent } from '../app/components/cta-banner/cta-banner.component';
import { FooterComponent } from '../app/components/footer/footer.component';

(async () => {
  const app = await createApplication({
    providers: [
      provideAnimationsAsync()
    ]
  });

  const elements: [string, any][] = [
    ['ca-nav',               NavComponent],
    ['ca-hero',              HeroComponent],
    ['ca-pain-point',        PainPointComponent],
    ['ca-services-overview', ServicesOverviewComponent],
    ['ca-how-it-works',      HowItWorksComponent],
    ['ca-why-crout',         WhyCroutComponent],
    ['ca-pricing',           PricingComponent],
    ['ca-cta-banner',        CtaBannerComponent],
    ['ca-footer',            FooterComponent],
  ];

  for (const [tag, component] of elements) {
    if (!customElements.get(tag)) {
      const el = createCustomElement(component, { injector: app.injector });
      customElements.define(tag, el);
    }
  }
})();
