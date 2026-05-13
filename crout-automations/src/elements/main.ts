/**
 * Angular Elements entry point.
 * Each component is registered as a native Custom Element.
 *
 * Build command:
 *   ng build crout-automations --configuration elements
 *
 * Output:  dist/crout-automations/
 *   - main.js        (all components bundled, no hashing)
 *   - polyfills.js   (zone.js)
 *   - styles.css
 *
 * WordPress usage — in your Elementor page / theme:
 *   <script defer src="/wp-content/themes/your-theme/crout-elements/polyfills.js"></script>
 *   <script defer src="/wp-content/themes/your-theme/crout-elements/main.js"></script>
 *   <ca-hero></ca-hero>
 *   <ca-pain-point></ca-pain-point>
 *   <ca-services-overview></ca-services-overview>
 *   <ca-how-it-works></ca-how-it-works>
 *   <ca-why-crout></ca-why-crout>
 *   <ca-pricing></ca-pricing>
 *   <ca-cta-banner></ca-cta-banner>
 *   <ca-privacy-policy></ca-privacy-policy>
 *
 * NOTE: <ca-nav> and <ca-footer> are intentionally excluded.
 * They live in wordpress-theme/ and are handled by the WP theme layer.
 */
import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { provideAnimations } from '@angular/platform-browser/animations';

import { HeroComponent } from '../app/components/hero/hero.component';
import { PainPointComponent } from '../app/components/pain-point/pain-point.component';
import { ServicesOverviewComponent } from '../app/components/services-overview/services-overview.component';
import { HowItWorksComponent } from '../app/components/how-it-works/how-it-works.component';
import { WhyCroutComponent } from '../app/components/why-crout/why-crout.component';
import { PricingComponent } from '../app/components/pricing/pricing.component';
import { CtaBannerComponent } from '../app/components/cta-banner/cta-banner.component';
import { PrivacyPolicyComponent } from '../app/components/privacy-policy/privacy-policy.component';

(async () => {
  const app = await createApplication({
    providers: [
      provideAnimations()
    ]
  });

  const elements: [string, any][] = [
    ['ca-hero',              HeroComponent],
    ['ca-pain-point',        PainPointComponent],
    ['ca-services-overview', ServicesOverviewComponent],
    ['ca-how-it-works',      HowItWorksComponent],
    ['ca-why-crout',         WhyCroutComponent],
    ['ca-pricing',           PricingComponent],
    ['ca-cta-banner',        CtaBannerComponent],
    ['ca-privacy-policy',    PrivacyPolicyComponent],
  ];

  for (const [tag, component] of elements) {
    if (!customElements.get(tag)) {
      const el = createCustomElement(component, { injector: app.injector });
      customElements.define(tag, el);
    }
  }
})();
