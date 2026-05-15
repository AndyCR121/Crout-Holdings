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
    loadComponent: () =>
      import('./pages/services/services.component').then(m => m.ServicesComponent),
    data: {
      seo: {
        title: 'Automation Services — Crout Automations',
        description: 'Explore custom automation services built for South African SMEs — lead capture, invoicing, client onboarding, AI agents, and more. Based in Bloemfontein.',
        canonical: '/services'
      }
    }
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
