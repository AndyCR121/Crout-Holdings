import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';
import { IAddonState, IPackageView } from '../../interfaces/i-service-display.interface';
import { IAddon, IPackage, IPricingComponent, IService } from '../../interfaces/i-service.interface';
import { ApiService } from '../../services/api.service';
import {
  dedupeAddonsById,
  serviceIcon,
  serviceLabel,
  serviceRoute,
  serviceTagline,
  sortServicesForDisplay,
} from '../../utils/service-display';

const MAX_VISIBLE_SERVICES = 4;

@Component({
  selector: 'ca-pricing',
  standalone: true,
  imports: [CommonModule, RouterModule, ScrollRevealDirective, SafeHtmlPipe],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss'
})
export class PricingComponent implements OnInit {
  private api = inject(ApiService);

  ghostLoaderOnLoad = signal<boolean>(true);

  services: IService[] = [];
  addons: IAddon[] = [];
  packages: IPackage[] = [];
  requiredPricingComponents: IPricingComponent[] = [];

  visibleServices: IService[] = [];
  visibleServicesLimited: IService[] = [];
  hasMoreServices = false;
  packageViews: IPackageView[] = [];

  readonly retainerPrice = 1200;
  readonly PACKAGE_DISCOUNT = 0.15;

  skeletonCards = Array(4).fill(null);
  skeletonPackages = Array(2).fill(null);

  ngOnInit(): void {
    this.onLoad();
  }

  onLoad(): void {
    forkJoin({
      svcs: this.api.getServices(),
      pkgs: this.api.getAllPackages(),
      requiredComponents: this.api.getRequiredPricingComponents(),
    }).pipe(
      switchMap(({ svcs, pkgs, requiredComponents }) => {
        const addonSvcs = svcs.filter(s => s.hasAddons && s.serviceId != null);
        const addonRequests = addonSvcs.length
          ? forkJoin(
              addonSvcs.map((service: IService) =>
                this.api.getAddonsByService(service.serviceId).pipe(
                  catchError(() => of([] as IAddon[]))
                )
              )
            )
          : of([] as IAddon[][]);

        return forkJoin({
          svcs: of(sortServicesForDisplay(svcs)),
          pkgs: of(pkgs),
          requiredComponents: of(requiredComponents),
          addonMatrix: addonRequests,
        });
      })
    ).subscribe({
      next: ({ svcs, pkgs, requiredComponents, addonMatrix }) => {
        this.services = svcs;
        this.packages = pkgs;
        this.requiredPricingComponents = requiredComponents.filter(component => component.isActive && component.isRequiredDefault);
        this.addons = dedupeAddonsById((addonMatrix as IAddon[][]).flat());
        this.buildViews();
        this.ghostLoaderOnLoad.set(false);
      },
      error: (err: unknown) => {
        const e = err as { message?: string; error?: string };
        console.error(e?.message ?? e?.error ?? 'Something went wrong onLoad()!');
        this.ghostLoaderOnLoad.set(false);
      },
    });
  }

  private buildViews(): void {
    this.visibleServices = sortServicesForDisplay(this.services.filter(service => !service.conditional));
    this.hasMoreServices = this.visibleServices.length > MAX_VISIBLE_SERVICES;
    this.visibleServicesLimited = this.hasMoreServices
      ? this.visibleServices.slice(0, MAX_VISIBLE_SERVICES)
      : this.visibleServices;

    this.packageViews = this.packages.map(pkg => {
      const parentPkg = pkg.parentPackageId != null
        ? this.packages.find(item => item.packageId === pkg.parentPackageId)
        : null;
      const serviceIds = [...new Set([
        ...(parentPkg?.serviceIds ?? []),
        ...(pkg.serviceIds ?? []),
      ])];

      const rootServices = serviceIds.reduce<IService[]>((acc, id) => {
        const service = this.services.find(item => item.serviceId === id);
        if (service) acc.push(service);
        return acc;
      }, []);

      const rootAddonStates: IAddonState[] = this.addonsForServiceIds(serviceIds)
        .map(addon => ({ addon, enabled: false }));

      return {
        pkg,
        childPkg: null,
        conditionalService: null,
        conditionalEnabled: false,
        rootServices,
        rootAddonStates,
        childAddonStates: [],
        conditionalIndex: -1,
        addonStates: [...rootAddonStates],
      } satisfies IPackageView;
    });
  }

  toggleConditional(view: IPackageView): void {
    view.conditionalEnabled = !view.conditionalEnabled;

    if (view.conditionalEnabled && view.childPkg && view.childAddonStates.length === 0) {
      view.childAddonStates = this.addonsForServiceIds(view.childPkg.serviceIds ?? [])
        .map(addon => ({ addon, enabled: false, isConditionalChild: true }));
    }

    view.addonStates = view.conditionalEnabled
      ? this.mergeAddonStates(view.rootAddonStates, view.childAddonStates)
      : [...view.rootAddonStates];
  }

  toggleAddon(state: IAddonState): void {
    state.enabled = !state.enabled;
  }

  activePkg(view: IPackageView): IPackage {
    return view.conditionalEnabled && view.childPkg ? view.childPkg : view.pkg;
  }

  activeServices(view: IPackageView): IService[] {
    if (view.conditionalEnabled && view.childPkg) {
      const childServices = (view.childPkg.serviceIds ?? []).reduce<IService[]>((acc, id) => {
        const service = this.services.find(item => item.serviceId === id);
        if (service) acc.push(service);
        return acc;
      }, []);
      const seen = new Set(view.rootServices.map(service => service.serviceId));
      const merged = [...view.rootServices];
      for (const service of childServices) {
        if (!seen.has(service.serviceId)) merged.push(service);
      }
      return merged;
    }

    return view.rootServices;
  }

  enabledAddonCount(view: IPackageView): number {
    return view.addonStates.filter(state => state.enabled).length;
  }

  private minAddonsRequired(view: IPackageView): number {
    return this.activePkg(view).minimumRequiredAddons ?? 0;
  }

  discountUnlocked(view: IPackageView): boolean {
    const min = this.minAddonsRequired(view);
    return min === 0 || this.enabledAddonCount(view) >= min;
  }

  addonsNeededForDiscount(view: IPackageView): number {
    return Math.max(0, this.minAddonsRequired(view) - this.enabledAddonCount(view));
  }

  basePrice(view: IPackageView): number {
    return this.activeServices(view).reduce((sum, service) => sum + (service.price ?? 0), 0);
  }

  enabledAddonTotal(view: IPackageView): number {
    return view.addonStates
      .filter(state => state.enabled)
      .reduce((sum, state) => sum + state.addon.price, 0);
  }

  fullTotal(view: IPackageView): number {
    return this.basePrice(view) + this.enabledAddonTotal(view) + this.requiredTotal();
  }

  requiredTotal(): number {
    return this.requiredPricingComponents.reduce((sum, component) => sum + (component.amount ?? 0), 0);
  }

  discountedTotal(view: IPackageView): number {
    if (!this.discountUnlocked(view)) return this.fullTotal(view);
    const discount = this.activePkg(view).discount ?? 0;
    return Math.round(this.fullTotal(view) * (1 - discount));
  }

  saving(view: IPackageView): number {
    return this.fullTotal(view) - this.discountedTotal(view);
  }

  startingPrice(): number {
    return this.visibleServicesLimited.reduce((lowest, service) => {
      const price = service.price ?? 0;
      return lowest === null || price < lowest ? price : lowest;
    }, null as number | null) ?? 0;
  }

  formatPrice(n: number | null | undefined): string {
    return Number(n ?? 0).toLocaleString('en-ZA');
  }

  serviceMonthlyPrice(service: IService): number {
    return (service.baseCost ?? 0) + (service.tokensCost ?? 0);
  }

  serviceAddonsByType(serviceId: number, type: IAddon['type']): IAddon[] {
    return this.addonsForServiceIds([serviceId]).filter(addon => addon.type === type);
  }

  addonTypeLabel(type: IAddon['type']): string {
    return type;
  }

  serviceCardLabel(service: IService): string {
    return serviceLabel(service);
  }

  serviceCardTagline(service: IService): string {
    return serviceTagline(service);
  }

  serviceCardIcon(service: IService): string {
    return serviceIcon(service);
  }

  serviceUrl(service: IService | null | undefined): string {
    return service ? serviceRoute(service) : '/services';
  }

  packageUrl(view: IPackageView): string {
    return this.serviceUrl(this.activeServices(view).find(service => !service.conditional) ?? this.activeServices(view)[0]);
  }

  private addonsForServiceIds(serviceIds: number[]): IAddon[] {
    if (serviceIds.length === 0) return [];
    const serviceIdSet = new Set(serviceIds);
    return dedupeAddonsById(this.addons.filter(addon =>
      addon.serviceIds?.some(id => serviceIdSet.has(id))
      || (addon.serviceId != null && serviceIdSet.has(addon.serviceId))
    ));
  }

  private mergeAddonStates(...lists: IAddonState[][]): IAddonState[] {
    const seen = new Map<number, IAddonState>();
    for (const list of lists) {
      for (const state of list) {
        if (!seen.has(state.addon.addonId)) {
          seen.set(state.addon.addonId, state);
        }
      }
    }
    return [...seen.values()];
  }
}
