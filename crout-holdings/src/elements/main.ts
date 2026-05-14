/**
 * Angular Elements entry point — Crout Holdings.
 *
 * WordPress usage:
 *   <ch-home assets-base="..." divisions-url="..." contact-url="..."></ch-home>
 *   <ch-privacy-policy assets-base="..."></ch-privacy-policy>
 *   <ch-contact-us></ch-contact-us>
 */
import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { importProvidersFrom } from '@angular/core';

import { HomePageComponent } from '../app/pages/home/home.page';
import { PrivacyPolicyComponent } from '../app/components/privacy-policy/privacy-policy.component';
import { ContactUsComponent } from '../app/components/contact-us/contact-us.component';

(async () => {
  const app = await createApplication({
    providers: [
      provideAnimations(),
      importProvidersFrom(ReactiveFormsModule)
    ]
  });

  const elements: [string, any][] = [
    ['ch-home',           HomePageComponent],
    ['ch-privacy-policy', PrivacyPolicyComponent],
    ['ch-contact-us',     ContactUsComponent],
  ];

  for (const [tag, component] of elements) {
    if (!customElements.get(tag)) {
      const el = createCustomElement(component, { injector: app.injector });
      customElements.define(tag, el);
    }
  }
})();
