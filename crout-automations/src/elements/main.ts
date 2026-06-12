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
import { AccountButtonComponent } from '../app/components/account-button/account-button.component';
import { AuthModalComponent } from '../app/components/auth-modal/auth-modal.component';
import { ServiceConfiguratorComponent } from '../app/components/service-configurator/service-configurator.component';
import { AdminComponent } from '../app/pages/admin/admin.component';
import { PortalComponent } from '../app/pages/portal/portal.component';
import { ContactComponent } from '../app/pages/contact/contact.component';
import { ServicesComponent } from '../app/pages/services/services.component';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { NotFoundComponent } from '../app/pages/not-found/not-found.component';
import { provideRouter } from '@angular/router';
import { HomeComponent } from '../app/pages/home/home.component';
import { MarketingSystemsComponent } from '../app/pages/services/marketing-systems/marketing-systems.component';
import { ProjectManagementComponent } from '../app/pages/services/project-management/project-management.component';
import { QuoteSystemComponent } from '../app/pages/services/quote-system/quote-system.component';
import { WhatsappAgentComponent } from '../app/pages/services/whatsapp-agent/whatsapp-agent.component';
import { NavbarComponent } from '../app/components/navbar/navbar.component';
import { FooterComponent } from '../app/components/footer/footer.component';

(async () => {
  const app = await createApplication({
    providers: [
      provideAnimations(),
      provideHttpClient(withFetch()),
      provideRouter([])
    ]
  });

  const elements: [string, any][] = [
    // ── Public section components ──────────────────────────────────────
    ['ca-privacy-policy',      PrivacyPolicyComponent],
    ['ca-service-configurator', ServiceConfiguratorComponent],
    ['ca-not-found',          NotFoundComponent],
    ['ca-home',              HomeComponent],
    
    // ── Services section components ────────────────────────────────────
    ['ca-quote-system',       QuoteSystemComponent],
    ['ca-whatsapp-agent',       WhatsappAgentComponent],
    ['ca-project-management',       ProjectManagementComponent],
    ['ca-marketing-systems',       MarketingSystemsComponent],

    // ── Auth / Account ─────────────────────────────────────────────────
    ['ca-account-button',      AccountButtonComponent],
    ['ca-auth-modal',          AuthModalComponent],
    
    // ── NavBar / Footer ────────────────────────────────────────────────
    ['ca-navbar',             NavbarComponent],
    ['ca-footer',              FooterComponent],

    // ── Full page shells (handle their own internal routing) ───────────
    ['ca-admin',               AdminComponent],
    ['ca-portal',              PortalComponent],
    ['ca-contact',             ContactComponent],
    ['ca-services',            ServicesComponent],
  ];

  for (const [tag, component] of elements) {
    if (!customElements.get(tag)) {
      const el = createCustomElement(component, { injector: app.injector });
      customElements.define(tag, el);
    }
  }
})();
