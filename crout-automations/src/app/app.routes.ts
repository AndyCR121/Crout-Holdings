import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { devGuard } from './guards/dev.guard';
import { pendingChangesGuard } from './guards/pending-changes.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then(m => m.HomeComponent),
    data: {
      seo: {
        title: 'Business Automation for South African SMEs',
        description: 'Crout Automations builds custom n8n workflows for South African businesses. WhatsApp AI agents, quoting automation, job card systems, and more. Based in Bloemfontein.',
        canonical: '/',
      },
    },
  },
  {
    path: 'home',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'client',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/portal/portal.component').then(m => m.PortalComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/portal/dashboard/portal-dashboard.component').then(m => m.PortalDashboardComponent),
      },
      {
        path: 'services',
        loadComponent: () =>
          import('./pages/portal/services/portal-services.component').then(m => m.PortalServicesComponent),
      },
      {
        path: 'video-editor',
        redirectTo: 'services',
        pathMatch: 'full',
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/portal/profile/portal-profile.component').then(m => m.PortalProfileComponent),
      },
      {
        path: 'billing',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/portal/billing/portal-billing.component').then(m => m.PortalBillingComponent),
          },
          {
            path: 'subscriptions',
            loadComponent: () =>
              import('./pages/portal/billing/subscriptions/portal-subscriptions.component').then(m => m.PortalSubscriptionsComponent),
          },
          {
            path: 'payment-methods',
            loadComponent: () =>
              import('./pages/portal/billing/payment-methods/portal-payment-methods.component').then(m => m.PortalPaymentMethodsComponent),
          },
        ],
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/admin/admin.component').then(m => m.AdminComponent),
    children: [
      {
        path: '',
        redirectTo: 'users',
        pathMatch: 'full',
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/admin/users/admin-users.component').then(m => m.AdminUsersComponent),
      },
      {
        path: 'services',
        loadComponent: () =>
          import('./pages/admin/services/admin-services.component').then(m => m.AdminServicesComponent),
      },
      {
        path: 'packages',
        loadComponent: () =>
          import('./pages/admin/packages/admin-packages.component').then(m => m.AdminPackagesComponent),
      },
      {
        path: 'companies',
        loadComponent: () =>
          import('./pages/admin/companies/admin-companies.component').then(m => m.AdminCompaniesComponent),
      },
      {
        path: 'dev-management',
        loadComponent: () =>
          import('./pages/admin/dev-management/admin-dev-management.component').then(m => m.AdminDevManagementComponent),
      },
      {
        path: 'client-services',
        loadComponent: () =>
          import('./pages/admin/client-services/admin-client-services.component').then(m => m.AdminClientServicesComponent),
      },
      {
        path: 'paystack-management',
        loadComponent: () =>
          import('./pages/admin/paystack-management/admin-paystack-management.component').then(m => m.AdminPaystackManagementComponent),
      },
      {
        path: 'integrations',
        loadComponent: () =>
          import('./pages/admin/integrations/admin-integrations.component').then(m => m.AdminIntegrationsComponent),
      },
      {
        path: 'integrations/credentials-builder',
        loadComponent: () =>
          import('./pages/admin/integrations/credential-builder/admin-integration-credential-builder.component').then(m => m.AdminIntegrationCredentialBuilderComponent),
      },
      {
        path: 'database-management',
        loadComponent: () =>
          import('./pages/admin/database-management/admin-database-management.component').then(m => m.AdminDatabaseManagementComponent),
      },
      {
        path: 'release-notes',
        loadComponent: () =>
          import('./pages/admin/release-notes/admin-release-notes.component').then(m => m.AdminReleaseNotesComponent),
      },
      {
        path: 'addons',
        loadComponent: () =>
          import('./pages/admin/addons/admin-addons.component').then(m => m.AdminAddonsComponent),
      },
      {
        path: 'service-features',
        loadComponent: () =>
          import('./pages/admin/service-features/admin-service-features.component').then(m => m.AdminServiceFeaturesComponent),
      },
    ],
  },
  {
    path: 'dev',
    canActivate: [authGuard, devGuard],
    loadComponent: () =>
      import('./pages/portal/portal.component').then(m => m.PortalComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dev/dashboard/dev-dashboard.component').then(m => m.DevDashboardComponent),
      },
      {
        path: 'dev-services',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/dev/services/dev-services.component').then(m => m.DevServicesComponent),
          },
          {
            path: 'guide',
            loadComponent: () =>
              import('./pages/dev/service-guide/dev-service-guide.component').then(m => m.DevServiceGuideComponent),
          },
          {
            path: 'guide/form-builder',
            canDeactivate: [pendingChangesGuard],
            loadComponent: () =>
              import('./pages/dev/service-guide/form-builder/dev-service-form-builder.component').then(m => m.DevServiceFormBuilderComponent),
          },
        ],
      },
      {
        path: 'services',
        redirectTo: 'dev-services',
        pathMatch: 'full',
      },
      {
        path: 'services/guide',
        redirectTo: 'dev-services/guide',
        pathMatch: 'full',
      },
      {
        path: 'services/guide/form-builder',
        redirectTo: 'dev-services/guide/form-builder',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'services',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/services/services.component').then(m => m.ServicesComponent),
        data: {
          seo: {
            title: 'Automation Services - Crout Automations',
            description: 'Explore custom automation services built for South African SMEs - quote systems, WhatsApp agents, project management, and marketing automation. Based in Bloemfontein.',
            canonical: '/services',
          },
        },
      },
      {
        path: 'ai-video-editor',
        redirectTo: 'marketing-systems',
        pathMatch: 'full',
      },
      {
        path: ':slug',
        loadComponent: () =>
          import('./pages/services/service-detail/service-detail.component').then(m => m.ServiceDetailComponent),
      },
    ],
  },
  {
    path: 'contact-us',
    loadComponent: () =>
      import('./pages/contact/contact.component').then(m => m.ContactComponent),
    data: {
      seo: {
        title: 'Contact Us - Book a Free Consultation',
        description: 'Crout Automations builds custom n8n workflows for South African businesses. WhatsApp AI agents, quoting automation, job card systems, and more. Based in Bloemfontein.',
        canonical: '/contact-us',
      },
    },
  },
  {
    path: 'privacy-policy',
    loadComponent: () =>
      import('./pages/privacy-policy/privacy-policy.page').then(m => m.PrivacyPolicyPageComponent),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent),
    data: {
      seo: {
        title: '404 - Page Not Found',
        description: 'This page does not exist.',
        noindex: true,
      },
    },
  },
];
