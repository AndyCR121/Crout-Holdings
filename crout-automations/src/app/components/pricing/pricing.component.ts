import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';
import { ApiService } from '../../services/api.service';
import { IService, IAddon, IPackage } from '../../interfaces/i-service.interface';
import { IAddonState, IPackageView } from '../../interfaces/i-service-display.interface';
import { FilterByServiceIdPipe } from '../../pipes/filter-by-service-id.pipe';
import { forkJoin, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

/** Maximum service cards shown in the pricing section before "View More" appears */
const MAX_VISIBLE_SERVICES = 6;

@Component({
  selector: 'ca-pricing',
  standalone: true,
  imports: [CommonModule, RouterModule, ScrollRevealDirective, FilterByServiceIdPipe],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss'
})
export class PricingComponent implements OnInit {

  private api = inject(ApiService);

  // ── Loading state ────────────────────────────────────────────────────────
  ghostLoaderOnLoad = signal<boolean>(true);

  // ── Raw data ──────────────────────────────────────────────────────────────
  services: IService[]  = [];
  addons:   IAddon[]    = [];
  packages: IPackage[]  = [];

  // ── Derived views ─────────────────────────────────────────────────────────
  visibleServices: IService[] = [];
  visibleServicesLimited: IService[] = [];
  hasMoreServices = false;
  packageViews: IPackageView[] = [];

  // ── Monthly retainer (static) ─────────────────────────────────────────────
  readonly retainerPrice    = 1200;
  readonly PACKAGE_DISCOUNT = 0.15;

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void { this.onLoad(); }

  onLoad(): void {
    // Step 1: fetch services + packages in parallel
    forkJoin({
      svcs: this.api.getServices(),
      pkgs: this.api.getAllPackages(),
    }).pipe(
      switchMap(({ svcs, pkgs }) => {
        // Only request addons for services that (a) have addons AND (b) have a valid service_id
        const addonSvcs = svcs.filter(s => s.hasAddons && s.serviceId != null);

        const addonRequests = addonSvcs.length
          ? forkJoin(
              addonSvcs.map((s: IService) =>
                this.api.getAddonsByService(s.serviceId).pipe(
                  // If one service's addon fetch fails (e.g. 404), return empty array
                  // so the rest of the load still completes.
                  catchError(() => of([] as IAddon[]))
                )
              )
            )
          : of([] as IAddon[][]);

        return forkJoin({ svcs: of(svcs), pkgs: of(pkgs), addonMatrix: addonRequests });
      })
    ).subscribe({
      next: ({ svcs, pkgs, addonMatrix }) => {
        this.services = svcs;
        this.packages = pkgs;
        // Flatten per-service addon arrays into one list
        this.addons   = (addonMatrix as IAddon[][]).flat();
        this.buildViews();
        this.ghostLoaderOnLoad.set(false);
      },
      error: (err: unknown) => {
        const e = err as { message?: string; error?: string };
        console.error(e?.message ?? e?.error ?? 'Something went wrong onLoad()!');
        // Still dismiss the ghost loader so the page isn't permanently stuck
        this.ghostLoaderOnLoad.set(false);
      },
    });
  }

  // ── View builders ─────────────────────────────────────────────────────────
  private buildViews(): void {
    this.visibleServices = this.services.filter(s => !s.conditional);
    this.hasMoreServices = this.visibleServices.length > MAX_VISIBLE_SERVICES;
    this.visibleServicesLimited = this.hasMoreServices
      ? this.visibleServices.slice(0, MAX_VISIBLE_SERVICES)
      : this.visibleServices;

    const childIds = new Set(
      this.packages
        .filter(p => p.parentPackageId != null)
        .map(p => p.packageId!)
    );

    const rootPackages = this.packages.filter(p => !childIds.has(p.packageId));

    this.packageViews = rootPackages.map(pkg => {
      const childPkg = this.packages.find(p => p.parentPackageId === pkg.packageId) ?? null;

      const conditionalService: IService | null = childPkg
        ? (this.services.find(
            s => s.conditional && (childPkg.service_ids ?? []).includes(s.serviceId)
          ) ?? null)
        : null;

      const rootServices: IService[] = (pkg.service_ids ?? []).reduce<IService[]>((acc, id) => {
        const svc = this.services.find(s => s.serviceId === id);
        if (svc) acc.push(svc);
        return acc;
      }, []);

      const rootAddonStates: IAddonState[] = (pkg.service_ids ?? []).flatMap(svcId =>
        this.addons
          .filter(a => a.serviceId === svcId)
          .map(a => ({ addon: a, enabled: false }))
      );

      const conditionalIndex = conditionalService ? rootAddonStates.length : -1;

      return {
        pkg,
        childPkg,
        conditionalService,
        conditionalEnabled: false,
        rootServices,
        rootAddonStates,
        childAddonStates: [],
        conditionalIndex,
        addonStates: [...rootAddonStates],
      } satisfies IPackageView;
    });
  }

  // ── Toggle helpers ────────────────────────────────────────────────────────

  toggleConditional(view: IPackageView): void {
    view.conditionalEnabled = !view.conditionalEnabled;

    if (view.conditionalEnabled && view.childPkg && view.childAddonStates.length === 0) {
      view.childAddonStates = (view.childPkg.service_ids ?? []).flatMap(svcId =>
        this.addons
          .filter(a => a.serviceId === svcId)
          .map(a => ({ addon: a, enabled: false, isConditionalChild: true }))
      );
    }

    view.addonStates = view.conditionalEnabled
      ? [...view.rootAddonStates, ...view.childAddonStates]
      : [...view.rootAddonStates];
  }

  toggleAddon(state: IAddonState): void { state.enabled = !state.enabled; }

  // ── Active package resolution ─────────────────────────────────────────────
  activePkg(view: IPackageView): IPackage {
    return view.conditionalEnabled && view.childPkg ? view.childPkg : view.pkg;
  }

  activeServices(view: IPackageView): IService[] {
    if (view.conditionalEnabled && view.childPkg) {
      const childServices = (view.childPkg.service_ids ?? []).reduce<IService[]>((acc, id) => {
        const svc = this.services.find(s => s.serviceId === id);
        if (svc) acc.push(svc);
        return acc;
      }, []);
      const seen = new Set(view.rootServices.map(s => s.serviceId));
      const merged = [...view.rootServices];
      for (const svc of childServices) {
        if (!seen.has(svc.serviceId)) merged.push(svc);
      }
      return merged;
    }
    return view.rootServices;
  }

  // ── Discount gate ─────────────────────────────────────────────────────────

  enabledAddonCount(view: IPackageView): number {
    return view.addonStates.filter(s => s.enabled).length;
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

  // ── Price helpers ─────────────────────────────────────────────────────────

  basePrice(view: IPackageView): number {
    const svcIds = view.pkg.service_ids ?? [];

    if (svcIds.length === 0) {
      const uniqueIds = [...new Set(
        view.addonStates.map(s => s.addon.serviceId).filter((id): id is number => id != null)
      )];
      return uniqueIds.reduce((sum, id) => {
        const svc = this.services.find(s => s.serviceId === id);
        return sum + (svc?.price ?? 0);
      }, 0);
    }

    const rootTotal = svcIds.reduce((sum, id) => {
      const svc = this.services.find(s => s.serviceId === id);
      return sum + (svc?.price ?? 0);
    }, 0);

    const conditionalPrice = (view.conditionalEnabled && view.conditionalService)
      ? (view.conditionalService.price ?? 0)
      : 0;

    return rootTotal + conditionalPrice;
  }

  enabledAddonTotal(view: IPackageView): number {
    return view.addonStates
      .filter(s => s.enabled)
      .reduce((sum, s) => sum + s.addon.price, 0);
  }

  fullTotal(view: IPackageView): number {
    return this.basePrice(view) + this.enabledAddonTotal(view);
  }

  discountedTotal(view: IPackageView): number {
    if (!this.discountUnlocked(view)) return this.fullTotal(view);
    const discount = this.activePkg(view).discount ?? 0;
    return Math.round(this.fullTotal(view) * (1 - discount));
  }

  saving(view: IPackageView): number {
    return this.fullTotal(view) - this.discountedTotal(view);
  }

  formatPrice(n: number): string {
    return n.toLocaleString('en-ZA');
  }

  // ── Ghost skeleton helpers ────────────────────────────────────────────────
  skeletonCards    = Array(3).fill(null);
  skeletonPackages = Array(2).fill(null);
}
