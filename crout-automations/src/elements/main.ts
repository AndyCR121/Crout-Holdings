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
 * WordPress / Elementor usage:
 *   <script defer src="/wp-content/themes/your-theme/crout-elements/polyfills.js"></script>
 *   <script defer src="/wp-content/themes/your-theme/crout-elements/main.js"></script>
 *
 * ── Public ──────────────────────────────────────────────────────────
 *   <ca-hero></ca-hero>
 *   <ca-pain-point></ca-pain-point>
 *   <ca-services-overview></ca-services-overview>
 *   <ca-how-it-works></ca-how-it-works>
 *   <ca-why-crout></ca-why-crout>
 *   <ca-pricing></ca-pricing>
 *   <ca-cta-banner></ca-cta-banner>
 *   <ca-privacy-policy></ca-privacy-policy>
 *
 * ── Shared sidebar components ────────────────────────────────────────
 *   <ca-portal-left-menu></ca-portal-left-menu>
 *   <ca-admin-left-menu></ca-admin-left-menu>
 *
 * ── Client Portal sub-pages (each self-contained with sidebar) ───────
 *   <ca-portal-dashboard></ca-portal-dashboard>
 *   <ca-portal-services></ca-portal-services>
 *   <ca-portal-profile></ca-portal-profile>
 *   <ca-portal-billing></ca-portal-billing>
 *   <ca-portal-subscriptions></ca-portal-subscriptions>
 *   <ca-portal-payment-methods></ca-portal-payment-methods>
 *
 * ── Admin Portal sub-pages (each self-contained with sidebar) ────────
 *   <ca-admin-users></ca-admin-users>
 *   <ca-admin-services></ca-admin-services>
 *   <ca-admin-packages></ca-admin-packages>
 *   <ca-admin-companies></ca-admin-companies>
 *   <ca-admin-addons></ca-admin-addons>
 *   <ca-admin-service-features></ca-admin-service-features>
 *
 * NOTE: <ca-portal> and <ca-admin> shell components have been removed.
 * Each sub-page is now standalone and includes its own sidebar.
 * <ca-nav> and <ca-footer> are handled by the WP theme layer.
 */
import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter } from '@angular/router';

// ── Public components ──────────────────────────────────────────────────────────
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
import { NavbarComponent } from '../app/components/navbar/navbar.component';
import { FooterComponent } from '../app/components/footer/footer.component';

// ── Pages (public) ─────────────────────────────────────────────────────────────
import { HomeComponent } from '../app/pages/home/home.component';
import { ContactComponent } from '../app/pages/contact/contact.component';
import { ServicesComponent } from '../app/pages/services/services.component';
import { MarketingSystemsComponent } from '../app/pages/services/marketing-systems/marketing-systems.component';
import { ProjectManagementComponent } from '../app/pages/services/project-management/project-management.component';
import { QuoteSystemComponent } from '../app/pages/services/quote-system/quote-system.component';
import { WhatsappAgentComponent } from '../app/pages/services/whatsapp-agent/whatsapp-agent.component';
import { NotFoundComponent } from '../app/pages/not-found/not-found.component';

// ── Shared left-menu components ────────────────────────────────────────────────
import { PortalLeftMenuComponent } from '../app/components/left-menu/portal-left-menu.component';
import { AdminLeftMenuComponent } from '../app/components/left-menu/admin-left-menu.component';

// ── Client Portal sub-pages ────────────────────────────────────────────────────
import { PortalDashboardComponent } from '../app/pages/portal/dashboard/portal-dashboard.component';
import { PortalServicesComponent } from '../app/pages/portal/services/portal-services.component';
import { PortalProfileComponent } from '../app/pages/portal/profile/portal-profile.component';
import { PortalBillingComponent } from '../app/pages/portal/billing/portal-billing.component';
import { PortalSubscriptionsComponent } from '../app/pages/portal/billing/subscriptions/portal-subscriptions.component';
import { PortalPaymentMethodsComponent } from '../app/pages/portal/billing/payment-methods/portal-payment-methods.component';

// ── Admin Portal sub-pages ─────────────────────────────────────────────────────
import { AdminUsersComponent } from '../app/pages/admin/users/admin-users.component';
import { AdminServicesComponent } from '../app/pages/admin/services/admin-services.component';
import { AdminPackagesComponent } from '../app/pages/admin/packages/admin-packages.component';
import { AdminCompaniesComponent } from '../app/pages/admin/companies/admin-companies.component';
import { AdminAddonsComponent } from '../app/pages/admin/addons/admin-addons.component';
import { AdminServiceFeaturesComponent } from '../app/pages/admin/service-features/admin-service-features.component';

(async () => {
  const app = await createApplication({
    providers: [
      provideAnimations(),
      provideHttpClient(withFetch()),
      provideRouter([])
    ]
  });

  const elements: [string, any][] = [
    // ── Public section components ──────────────────────────────────────────────
    ['ca-privacy-policy',         PrivacyPolicyComponent],
    ['ca-service-configurator',   ServiceConfiguratorComponent],
    ['ca-not-found',              NotFoundComponent],
    ['ca-home',                   HomeComponent],

    // ── Services section components ────────────────────────────────────────────
    ['ca-quote-system',           QuoteSystemComponent],
    ['ca-whatsapp-agent',         WhatsappAgentComponent],
    ['ca-project-management',     ProjectManagementComponent],
    ['ca-marketing-systems',      MarketingSystemsComponent],

    // ── Auth / Account ─────────────────────────────────────────────────────────
    ['ca-account-button',         AccountButtonComponent],
    ['ca-auth-modal',             AuthModalComponent],

    // ── NavBar / Footer ────────────────────────────────────────────────────────
    ['ca-navbar',                 NavbarComponent],
    ['ca-footer',                 FooterComponent],

    // ── Full page shells ───────────────────────────────────────────────────────
    ['ca-contact',                ContactComponent],
    ['ca-services',               ServicesComponent],

    // ── Shared left-menu components ────────────────────────────────────────────
    ['ca-portal-left-menu',       PortalLeftMenuComponent],
    ['ca-admin-left-menu',        AdminLeftMenuComponent],

    // ── Client Portal sub-pages ────────────────────────────────────────────────
    ['ca-portal-dashboard',       PortalDashboardComponent],
    ['ca-portal-services',        PortalServicesComponent],
    ['ca-portal-profile',         PortalProfileComponent],
    ['ca-portal-billing',         PortalBillingComponent],
    ['ca-portal-subscriptions',   PortalSubscriptionsComponent],
    ['ca-portal-payment-methods', PortalPaymentMethodsComponent],

    // ── Admin Portal sub-pages ─────────────────────────────────────────────────
    ['ca-admin-users',            AdminUsersComponent],
    ['ca-admin-services',         AdminServicesComponent],
    ['ca-admin-packages',         AdminPackagesComponent],
    ['ca-admin-companies',        AdminCompaniesComponent],
    ['ca-admin-addons',           AdminAddonsComponent],
    ['ca-admin-service-features', AdminServiceFeaturesComponent],
  ];

  for (const [tag, component] of elements) {
    if (!customElements.get(tag)) {
      const el = createCustomElement(component, { injector: app.injector });
      customElements.define(tag, el);
    }
  }
})();
