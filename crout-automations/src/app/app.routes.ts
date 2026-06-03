import { Routes } from '@angular/router';

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
