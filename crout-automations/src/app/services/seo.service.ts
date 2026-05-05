import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs/operators';

export interface SeoConfig {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  noindex?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly titleSvc = inject(Title);
  private readonly metaSvc  = inject(Meta);
  private readonly router   = inject(Router);
  private readonly route    = inject(ActivatedRoute);

  private readonly SITE_NAME = 'Crout Automations';
  private readonly BASE_URL  = 'https://crout-automations.co.za';
  private readonly DEFAULT_IMAGE = `${this.BASE_URL}/assets/og-image.jpg`;

  /** Call once in AppComponent.ngOnInit() */
  init(): void {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.route),
      map(r => {
        while (r.firstChild) r = r.firstChild;
        return r;
      }),
      mergeMap(r => r.data)
    ).subscribe(data => {
      const seo: SeoConfig = data['seo'] ?? {};
      this.set(seo);
    });
  }

  set(config: SeoConfig): void {
    const title       = config.title ? `${config.title} | ${this.SITE_NAME}` : this.SITE_NAME;
    const description = config.description ?? 'Custom n8n automation workflows for South African businesses. WhatsApp AI agents, quoting, job cards, and more.';
    const canonical   = config.canonical ? `${this.BASE_URL}${config.canonical}` : this.BASE_URL;
    const image       = config.ogImage ?? this.DEFAULT_IMAGE;

    // Title
    this.titleSvc.setTitle(title);

    // Standard meta
    this.metaSvc.updateTag({ name: 'description',        content: description });
    this.metaSvc.updateTag({ name: 'robots',             content: config.noindex ? 'noindex,nofollow' : 'index,follow' });

    // Open Graph
    this.metaSvc.updateTag({ property: 'og:type',        content: 'website' });
    this.metaSvc.updateTag({ property: 'og:site_name',   content: this.SITE_NAME });
    this.metaSvc.updateTag({ property: 'og:title',       content: title });
    this.metaSvc.updateTag({ property: 'og:description', content: description });
    this.metaSvc.updateTag({ property: 'og:url',         content: canonical });
    this.metaSvc.updateTag({ property: 'og:image',       content: image });
    this.metaSvc.updateTag({ property: 'og:image:width', content: '1200' });
    this.metaSvc.updateTag({ property: 'og:image:height',content: '630' });

    // Twitter Card
    this.metaSvc.updateTag({ name: 'twitter:card',        content: 'summary_large_image' });
    this.metaSvc.updateTag({ name: 'twitter:title',       content: title });
    this.metaSvc.updateTag({ name: 'twitter:description', content: description });
    this.metaSvc.updateTag({ name: 'twitter:image',       content: image });

    // Canonical
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonical);
  }
}
