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
 *
 * Public section components:
 *   <ca-hero></ca-hero>
 *   <ca-pain-point></ca-pain-point>
 *   <ca-services-overview></ca-services-overview>
 *   <ca-how-it-works></ca-how-it-works>
 *   <ca-why-crout></ca-why-crout>
 *   <ca-pricing></ca-pricing>
 *   <ca-cta-banner></ca-cta-banner>
 *   <ca-privacy-policy></ca-privacy-policy>
 *
 * Admin pages (standalone — include their own sidebar):
 *   <ca-admin-users></ca-admin-users>
 *   <ca-admin-services></ca-admin-services>
 *   <ca-admin-packages></ca-admin-packages>
 *   <ca-admin-addons></ca-admin-addons>
 *   <ca-admin-service-features></ca-admin-service-features>
 *   <ca-admin-companies></ca-admin-companies>
 *
 * Portal pages (standalone — include their own sidebar):
 *   <ca-portal-dashboard></ca-portal-dashboard>
 *   <ca-portal-services></ca-portal-services>
 *   <ca-portal-profile></ca-portal-profile>
 *   <ca-portal-subscriptions></ca-portal-subscriptions>
 *   <ca-portal-payment-methods></ca-portal-payment-methods>
 *
 * NOTE: <ca-nav> and <ca-footer> are intentionally excluded.
 * They live in wordpress-theme/ and are handled by the WP theme layer.
 *
 * NOTE: <ca-admin-sidebar> and <ca-portal-sidebar> are intentionally excluded.
 * They are embedded directly inside the sub-page components above.
 *
 * NOTE: <ca-portal-billing> (redirect shell) is intentionally excluded.
 * Sub-pages are registered directly as top-level elements.
 */
import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter } from '@angular/router';

// ── Public section components ──────────────────────────────────────────────
import { HeroComponent } from '../app/components/hero/hero.component';
import { PainPointComponent } from '../app/components/pain-point/pain-point.component';
import { ServicesOverviewComponent } from '../app/components/services-overview/services-overview.component';
import { HowItWorksComponent } from '../app/components/how-it-works/how-it-works.component';
import { WhyCroutComponent } from '../app/components/why-crout/why-crout.component';
import { PricingComponent } from '../app/components/pricing/pricing.component';
import { CtaBannerComponent } from '../app/components/cta-banner/cta-banner.component';
import { PrivacyPolicyComponent } from '../app/components/privacy-policy/privacy-policy.component';

// ── Auth / Account ─────────────────────────────────────────────────────────
import { AccountButtonComponent } from '../app/components/account-button/account-button.component';
import { AuthModalComponent } from '../app/components/auth-modal/auth-modal.component';

// ── NavBar / Footer ────────────────────────────────────────────────────────
import { NavbarComponent } from '../app/components/navbar/navbar.component';
import { FooterComponent } from '../app/components/footer/footer.component';

// ── Misc public pages ──────────────────────────────────────────────────────
import { NotFoundComponent } from '../app/pages/not-found/not-found.component';
import { HomeComponent } from '../app/pages/home/home.component';
import { ContactComponent } from '../app/pages/contact/contact.component';
import { ServicesComponent } from '../app/pages/services/services.component';
import { ServiceConfiguratorComponent } from '../app/components/service-configurator/service-configurator.component';

// ── Service sub-pages ──────────────────────────────────────────────────────
import { MarketingSystemsComponent } from '../app/pages/services/marketing-systems/marketing-systems.component';
import { ProjectManagementComponent } from '../app/pages/services/project-management/project-management.component';
import { QuoteSystemComponent } from '../app/pages/services/quote-system/quote-system.component';
import { WhatsappAgentComponent } from '../app/pages/services/whatsapp-agent/whatsapp-agent.component';

// ── Admin sub-pages (standalone — embed AdminSidebarComponent internally) ──
import { AdminUsersComponent } from '../app/pages/admin/users/admin-users.component';
import { AdminServicesComponent } from '../app/pages/admin/services/admin-services.component';
import { AdminPackagesComponent } from '../app/pages/admin/packages/admin-packages.component';
import { AdminAddonsComponent } from '../app/pages/admin/addons/admin-addons.component';
import { AdminServiceFeaturesComponent } from '../app/pages/admin/service-features/admin-service-features.component';
import { AdminCompaniesComponent } from '../app/pages/admin/companies/admin-companies.component';

// ── Portal sub-pages (standalone — embed PortalSidebarComponent internally) ─
import { PortalDashboardComponent } from '../app/pages/portal/dashboard/portal-dashboard.component';
import { PortalServicesComponent } from '../app/pages/portal/services/portal-services.component';
import { PortalProfileComponent } from '../app/pages/portal/profile/portal-profile.component';
import { PortalSubscriptionsComponent } from '../app/pages/portal/billing/subscriptions/portal-subscriptions.component';
import { PortalPaymentMethodsComponent } from '../app/pages/portal/billing/payment-methods/portal-payment-methods.component';

(async () => {
  const app = await createApplication({
    providers: [
      provideAnimations(),
      provideHttpClient(withFetch()),
      provideRouter([])
    ]
  });

  const elements: [string, any][] = [
    // ── Public section components ────────────────────────────────────────
    // ['ca-hero',                   HeroComponent],
    // ['ca-pain-point',             PainPointComponent],
    // ['ca-services-overview',      ServicesOverviewComponent],
    // ['ca-how-it-works',           HowItWorksComponent],
    // ['ca-why-crout',              WhyCroutComponent],
    // ['ca-pricing',                PricingComponent],
    // ['ca-cta-banner',             CtaBannerComponent],
    ['ca-privacy-policy',         PrivacyPolicyComponent],

    // ['ca-service-configurator',   ServiceConfiguratorComponent],

    // ── Auth / Account ───────────────────────────────────────────────────
    ['ca-account-button',         AccountButtonComponent],
    ['ca-auth-modal',             AuthModalComponent],

    // ── NavBar / Footer ──────────────────────────────────────────────────
    ['ca-navbar',                 NavbarComponent],
    ['ca-footer',                 FooterComponent],

    // ── Misc public pages ────────────────────────────────────────────────
    ['ca-not-found',              NotFoundComponent],
    ['ca-home',                   HomeComponent],
    ['ca-contact',                ContactComponent],
    ['ca-services',               ServicesComponent],

    // ── Service sub-pages ────────────────────────────────────────────────
    ['ca-quote-system',           QuoteSystemComponent],
    ['ca-whatsapp-agent',         WhatsappAgentComponent],
    ['ca-project-management',     ProjectManagementComponent],
    ['ca-marketing-systems',      MarketingSystemsComponent],

    // ── Admin sub-pages ──────────────────────────────────────────────────
    ['ca-admin-users',            AdminUsersComponent],
    ['ca-admin-services',         AdminServicesComponent],
    ['ca-admin-packages',         AdminPackagesComponent],
    ['ca-admin-addons',           AdminAddonsComponent],
    ['ca-admin-service-features', AdminServiceFeaturesComponent],
    ['ca-admin-companies',        AdminCompaniesComponent],

    // ── Portal sub-pages ─────────────────────────────────────────────────
    ['ca-portal-dashboard',       PortalDashboardComponent],
    ['ca-portal-services',        PortalServicesComponent],
    ['ca-portal-profile',         PortalProfileComponent],
    ['ca-portal-subscriptions',   PortalSubscriptionsComponent],
    ['ca-portal-payment-methods', PortalPaymentMethodsComponent],
  ];

  for (const [tag, component] of elements) {
    if (!customElements.get(tag)) {
      const el = createCustomElement(component, { injector: app.injector });
      customElements.define(tag, el);
    }
  }
})();
