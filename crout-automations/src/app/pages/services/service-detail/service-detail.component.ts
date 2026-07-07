import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CtaBannerComponent } from '../../../components/cta-banner/cta-banner.component';
import { ServiceConfiguratorComponent } from '../../../components/service-configurator/service-configurator.component';
import { ScrollRevealDirective } from '../../../directives/scroll-reveal.directive';
import { SafeHtmlPipe } from '../../../pipes/safe-html.pipe';
import { IService, IAddon, IPackage } from '../../../interfaces/i-service.interface';
import { ApiService } from '../../../services/api.service';
import { SeoService } from '../../../services/seo.service';
import {
  dedupeAddonsById,
  serviceIcon,
  serviceLabel,
  serviceRoute,
  serviceSlug,
  serviceTagline,
  sortServicesForDisplay,
} from '../../../utils/service-display';

const FEATURE_ICON = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;

@Component({
  selector: 'ca-service-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, CtaBannerComponent, ScrollRevealDirective, SafeHtmlPipe, ServiceConfiguratorComponent],
  templateUrl: './service-detail.component.html',
  styleUrl: './service-detail.component.scss'
})
export class ServiceDetailComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);

  loading = signal(true);
  notFound = signal(false);
  service = signal<IService | null>(null);
  addons = signal<IAddon[]>([]);
  packages = signal<IPackage[]>([]);
  allServices = signal<IService[]>([]);

  readonly serviceTitle = computed(() => {
    const service = this.service();
    return service ? serviceLabel(service) : '';
  });

  readonly serviceTaglineText = computed(() => {
    const service = this.service();
    return service ? serviceTagline(service) : '';
  });

  readonly serviceDescriptionText = computed(() => this.service()?.serviceDescription?.trim() ?? '');

  readonly serviceIconSvg = computed(() => {
    const service = this.service();
    return service ? serviceIcon(service) : '';
  });

  readonly featureCards = computed(() =>
    (this.service()?.features ?? []).map(feature => ({
      title: feature,
      icon: FEATURE_ICON,
    }))
  );

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug')?.trim().toLowerCase() ?? '';
      void this.loadBySlug(slug);
    });
  }

  private async loadBySlug(slug: string): Promise<void> {
    this.loading.set(true);
    this.notFound.set(false);
    this.service.set(null);
    this.addons.set([]);
    this.packages.set([]);

    try {
      const services = sortServicesForDisplay(await firstValueFrom(this.api.getServices()) ?? []);
      this.allServices.set(services);

      const service = services.find(item => serviceSlug(item) === slug) ?? null;
      if (!service) {
        this.notFound.set(true);
        this.seo.set({
          title: 'Service Not Found',
          description: 'The requested service could not be found.',
          canonical: '/services',
          noindex: true,
        });
        return;
      }

      this.service.set(service);

      const packages = await firstValueFrom(this.api.getPackagesByService(service.serviceId)) ?? [];
      const relatedServiceIds = [...new Set([service.serviceId, ...packages.flatMap(pkg => pkg.serviceIds ?? [])])];
      const addonMatrix = await Promise.all(
        relatedServiceIds.map(async serviceId => {
          try {
            return await firstValueFrom(this.api.getAddonsByService(serviceId)) ?? [];
          } catch {
            return [] as IAddon[];
          }
        })
      );

      this.packages.set(packages);
      this.addons.set(dedupeAddonsById(addonMatrix.flat()));
      this.seo.set({
        title: `${serviceLabel(service)} - Automation Service`,
        description: serviceTagline(service),
        canonical: serviceRoute(service),
      });
    } catch (error: any) {
      console.error(error?.message ?? error ?? 'ServiceDetailComponent load failed');
      this.notFound.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
