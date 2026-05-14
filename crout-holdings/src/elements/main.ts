/**
 * Angular Elements entry point — Crout Holdings.
 * Each component is registered as a native Custom Element.
 *
 * Build command:
 *   npm run build:elements
 *   (runs: ng build crout-holdings --configuration elements)
 *
 * Output: dist/crout-holdings/
 *   - main.js        (all components bundled, no hashing)
 *   - polyfills.js   (zone.js)
 *   - styles.css
 *   - assets/        (static assets copied from src/assets)
 *
 * WordPress usage (home page example):
 *   <ch-home
 *     assets-base="https://domain.com/wp-content/themes/theme/crout-elements/assets/"
 *     divisions-url="https://domain.com/divisions"
 *     contact-url="https://domain.com/contact-us">
 *   </ch-home>
 *
 * WordPress usage (privacy policy):
 *   <ch-privacy-policy
 *     assets-base="https://domain.com/wp-content/themes/theme/crout-elements/assets/">
 *   </ch-privacy-policy>
 *
 * NOTE: Nav and footer are handled by the WP theme layer.
 */
import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { provideAnimations } from '@angular/platform-browser/animations';

import { HomePageComponent } from '../app/pages/home/home.page';
import { PrivacyPolicyComponent } from '../app/components/privacy-policy/privacy-policy.component';

(async () => {
  const app = await createApplication({
    providers: [provideAnimations()]
  });

  const elements: [string, any][] = [
    ['ch-home',           HomePageComponent],
    ['ch-privacy-policy', PrivacyPolicyComponent],
  ];

  for (const [tag, component] of elements) {
    if (!customElements.get(tag)) {
      const el = createCustomElement(component, { injector: app.injector });
      customElements.define(tag, el);
    }
  }
})();
