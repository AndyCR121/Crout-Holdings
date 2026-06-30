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
        canonical: '/'
      }
    }
  },
  {
    path: 'home',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'client',
    redirectTo: 'client/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'admin',
    redirectTo: 'admin/users',
    pathMatch: 'full'
  },
  {
    path: 'dev',
    redirectTo: 'dev/dashboard',
    pathMatch: 'full'
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
            title: 'Automation Services — Crout Automations',
            description: 'Explore custom automation services built for South African SMEs — quote systems, WhatsApp agents, project management, and marketing automation. Based in Bloemfontein.',
            canonical: '/services'
          }
        }
      },
      {
        path: 'quote-system',
        loadComponent: () =>
          import('./pages/services/quote-system/quote-system.component').then(m => m.QuoteSystemComponent),
        data: {
          seo: {
            title: 'Quote & Invoice Automation — Crout Automations',
            description: 'Automate your quoting and invoicing with Xero-integrated, multi-platform, and custom systems. Smart summaries, complex calculations, and invoice follow-ups — all hands-free.',
            canonical: '/services/quote-system'
          }
        }
      },
      {
        path: 'whatsapp-agent',
        loadComponent: () =>
          import('./pages/services/whatsapp-agent/whatsapp-agent.component').then(m => m.WhatsappAgentComponent),
        data: {
          seo: {
            title: 'WhatsApp AI Agent — Crout Automations',
            description: 'Deploy a WhatsApp AI agent that handles client support, sends notifications, gathers quote details, and reaches your client base — automatically, 24/7.',
            canonical: '/services/whatsapp-agent'
          }
        }
      },
      {
        path: 'project-management',
        loadComponent: () =>
          import('./pages/services/project-management/project-management.component').then(m => m.ProjectManagementComponent),
        data: {
          seo: {
            title: 'Automated Project Management — Crout Automations',
            description: 'Auto-create Trello cards, manage Jira boards, and run fully automated project workflows. Custom systems built around how your team works.',
            canonical: '/services/project-management'
          }
        }
      },
      {
        path: 'marketing-systems',
        loadComponent: () =>
          import('./pages/services/marketing-systems/marketing-systems.component').then(m => m.MarketingSystemsComponent),
        data: {
          seo: {
            title: 'AI Marketing Systems — Crout Automations',
            description: 'Automated branded content, AI face & voice videos, social media scheduling, SEO analytics, after-hours receptionist, and CRM — all powered by AI.',
            canonical: '/services/marketing-systems'
          }
        }
      },
      {
        path: 'ai-video-editor',
        redirectTo: 'marketing-systems',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'contact-us',
    loadComponent: () =>
      import('./pages/contact/contact.component').then(m => m.ContactComponent),
    data: {
      seo: {
        title: 'Contact Us — Book a Free Consultation',
        description: 'Crout Automations builds custom n8n workflows for South African businesses. WhatsApp AI agents, quoting automation, job card systems, and more. Based in Bloemfontein.',
        canonical: '/contact-us'
      }
    }
  },
  {
    path: 'privacy-policy',
    loadComponent: () =>
      import('./pages/privacy-policy/privacy-policy.page').then(m => m.PrivacyPolicyPageComponent)
  },
  // ── Client Portal (auth-guarded) ────────────────────────────────────────────
  {
    path: 'client/dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/portal/dashboard/portal-dashboard.component').then(m => m.PortalDashboardComponent),
  },
  {
    path: 'client/services',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/portal/services/portal-services.component').then(m => m.PortalServicesComponent),
  },
  {
    path: 'client/video-editor',
    redirectTo: 'client/services',
    pathMatch: 'full',
  },
  {
    path: 'client/profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/portal/profile/portal-profile.component').then(m => m.PortalProfileComponent),
  },
  {
    path: 'client/billing',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/portal/billing/portal-billing.component').then(m => m.PortalBillingComponent),
  },
  {
    path: 'client/billing/subscriptions',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/portal/billing/subscriptions/portal-subscriptions.component').then(m => m.PortalSubscriptionsComponent),
  },
  {
    path: 'client/billing/payment-methods',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/portal/billing/payment-methods/portal-payment-methods.component').then(m => m.PortalPaymentMethodsComponent),
  },
  // Dev Portal
  {
    path: 'dev/dashboard',
    canActivate: [authGuard, devGuard],
    loadComponent: () =>
      import('./pages/dev/dashboard/dev-dashboard.component').then(m => m.DevDashboardComponent),
  },
  {
    path: 'dev/dev-services/guide',
    canActivate: [authGuard, devGuard],
    loadComponent: () =>
      import('./pages/dev/service-guide/dev-service-guide.component').then(m => m.DevServiceGuideComponent),
  },
  {
    path: 'dev/dev-services/guide/form-builder',
    canActivate: [authGuard, devGuard],
    canDeactivate: [pendingChangesGuard],
    loadComponent: () =>
      import('./pages/dev/service-guide/form-builder/dev-service-form-builder.component').then(m => m.DevServiceFormBuilderComponent),
  },
  {
    path: 'dev/dev-services',
    canActivate: [authGuard, devGuard],
    loadComponent: () =>
      import('./pages/dev/services/dev-services.component').then(m => m.DevServicesComponent),
  },
  {
    path: 'dev/services',
    redirectTo: 'dev/dev-services',
    pathMatch: 'full',
  },
  {
    path: 'dev/services/guide',
    redirectTo: 'dev/dev-services/guide',
    pathMatch: 'full',
  },
  {
    path: 'dev/services/guide/form-builder',
    redirectTo: 'dev/dev-services/guide/form-builder',
    pathMatch: 'full',
  },
  // ── Admin Portal (auth + admin guard) ───────────────────────────────────────
  { path: '', redirectTo: 'users', pathMatch: 'full' },
  {
    path: 'admin/users',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/admin/users/admin-users.component').then(m => m.AdminUsersComponent),
  },
  {
    path: 'admin/services',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/admin/services/admin-services.component').then(m => m.AdminServicesComponent),
  },
  {
    path: 'admin/packages',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/admin/packages/admin-packages.component').then(m => m.AdminPackagesComponent),
  },
  {
    path: 'admin/companies',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/admin/companies/admin-companies.component').then(m => m.AdminCompaniesComponent),
  },
  {
    path: 'admin/dev-management',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/admin/dev-management/admin-dev-management.component').then(m => m.AdminDevManagementComponent),
  },
  {
    path: 'admin/client-services',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/admin/client-services/admin-client-services.component').then(m => m.AdminClientServicesComponent),
  },
  {
    path: 'admin/paystack-management',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/admin/paystack-management/admin-paystack-management.component').then(m => m.AdminPaystackManagementComponent),
  },
  {
    path: 'admin/addons',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/admin/addons/admin-addons.component').then(m => m.AdminAddonsComponent),
  },
  {
    path: 'admin/service-features',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/admin/service-features/admin-service-features.component').then(m => m.AdminServiceFeaturesComponent),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent),
    data: {
      seo: {
        title: '404 — Page Not Found',
        description: 'This page does not exist.',
        noindex: true
      }
    }
  }
];
