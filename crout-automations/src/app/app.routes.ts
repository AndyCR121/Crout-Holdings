import { Routes } from '@angular/router';
import { environment } from '../environments/environment';

const devRoutes: Routes = environment.production ? [] : [
  {
    path: 'privacy-policy',
    loadComponent: () =>
      import('./pages/privacy-policy/privacy-policy.page').then(m => m.PrivacyPolicyPageComponent)
  }
];

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
  ...devRoutes,
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
