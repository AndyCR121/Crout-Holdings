import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';
import { ApiService } from '../../services/api.service';
import { IService, IAddon, IPackage } from '../../interfaces/i-service.interface';
import { IAddonState, IPackageView } from '../../interfaces/i-service-display.interface';
import { FindByIdPipe } from '../../pipes/find-by-id.pipe';
import { FilterByServiceIdPipe } from '../../pipes/filter-by-service-id.pipe';

/** Maximum service cards shown in the pricing section before "View More" appears */
const MAX_VISIBLE_SERVICES = 6;

/** Minimum number of add-ons that must be enabled before the bundle discount applies */
const MIN_ADDONS_FOR_DISCOUNT = 2;

@Component({
  selector: 'ca-pricing',
  standalone: true,
  imports: [CommonModule, RouterModule, ScrollRevealDirective, FindByIdPipe, FilterByServiceIdPipe],
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
  /** Services where Conditional === false — shown as individual cards */
  visibleServices: IService[] = [];

  /** Capped at MAX_VISIBLE_SERVICES for the pricing section */
  visibleServicesLimited: IService[] = [];

  /** True when there are more services than MAX_VISIBLE_SERVICES */
  hasMoreServices = false;

  /** Root packages (no parent_package_id) — the ones we render */
  packageViews: IPackageView[] = [];

  // ── Monthly retainer (static) ─────────────────────────────────────────────
  readonly retainerPrice = 1200;

  readonly PACKAGE_DISCOUNT = 0.15;

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.onLoad();
  }

  async onLoad(): Promise<void> {
    try {
      const [svcs, ads, pkgs] = await Promise.all([
        this.api.getServices().toPromise(),
        this.api.getAddons().toPromise(),
        this.api.getPackages().toPromise(),
      ]);

      if (svcs && ads && pkgs) {
        this.services  = svcs;
        this.addons    = ads;
        this.packages  = pkgs;
        this.buildViews();
        this.ghostLoaderOnLoad.set(false);
      }
    } catch (error: any) {
      console.error(
        error ? (error.message ?? error.error ?? error) : 'Something went wrong onLoad()!'
      );
    }
  }

  // ── View builders ─────────────────────────────────────────────────────────
  private buildViews(): void {
    this.visibleServices = this.services.filter(s => !s.Conditional);

    this.hasMoreServices = this.visibleServices.length > MAX_VISIBLE_SERVICES;
    this.visibleServicesLimited = this.hasMoreServices
      ? this.visibleServices.slice(0, MAX_VISIBLE_SERVICES)
      : this.visibleServices;

    const childIds = new Set(
      this.packages
        .filter(p => p.parent_package_id != null)
        .map(p => p.parent_package_id!)
    );

    const rootPackages = this.packages.filter(p => !childIds.has(p.package_id));

    this.packageViews = rootPackages.map(pkg => {
      const childPkg = this.packages.find(p => p.parent_package_id === pkg.package_id) ?? null;

      // Resolve conditional service from the child package's service_ids.
      // A conditional service is any service flagged Conditional === true
      // that appears in the child package's service_ids list.
      const conditionalService: IService | null = childPkg
        ? (this.services.find(
            s => s.Conditional && (childPkg.service_ids ?? []).includes(s.service_id)
          ) ?? null)
        : null;

      // Resolve all IService objects for the root package.
      const rootServices: IService[] = (pkg.service_ids ?? []).reduce<IService[]>((acc, id) => {
        const svc = this.services.find(s => s.service_id === id);
        if (svc) acc.push(svc);
        return acc;
      }, []);

      // Build stable root addon list — aggregated across ALL root service IDs.
      const rootAddonStates: IAddonState[] = (pkg.service_ids ?? []).flatMap(svcId =>
        this.addons
          .filter(a => a.service_id === svcId)
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
        childAddonStates: [],   // populated once on first conditional toggle
        conditionalIndex,
        addonStates: [...rootAddonStates],
      } satisfies IPackageView;
    });
  }

  // ── Toggle helpers ────────────────────────────────────────────────────────

  /**
   * Toggles the conditional (child) service on or off.
   *
   * Rules:
   * 1. Root addon states (and any user selections) are NEVER reset.
   * 2. Child addons are built once on the first enable, reused thereafter
   *    (preserving user's child-addon selections across toggles).
   * 3. Child addons are appended after all root addons so the conditional
   *    toggle row keeps its visual position in the HTML.
   */
  toggleConditional(view: IPackageView): void {
    view.conditionalEnabled = !view.conditionalEnabled;

    if (view.conditionalEnabled && view.childPkg) {
      // Build child addon states once; reuse on subsequent toggles.
      if (view.childAddonStates.length === 0) {
        view.childAddonStates = (view.childPkg.service_ids ?? []).flatMap(svcId =>
          this.addons
            .filter(a => a.service_id === svcId)
            .map(a => ({ addon: a, enabled: false, isConditionalChild: true }))
        );
      }
    }

    view.addonStates = this.buildMergedAddonList(view);
  }

  /**
   * Merges root and (optionally) child addon states into a stable list.
   * OFF → root only; ON → root + child appended.
   */
  private buildMergedAddonList(view: IPackageView): IAddonState[] {
    if (!view.conditionalEnabled) {
      return [...view.rootAddonStates];
    }
    return [...view.rootAddonStates, ...view.childAddonStates];
  }

  toggleAddon(state: IAddonState): void {
    state.enabled = !state.enabled;
  }

  // ── Active package resolution ─────────────────────────────────────────────
  activePkg(view: IPackageView): IPackage {
    return view.conditionalEnabled && view.childPkg ? view.childPkg : view.pkg;
  }

  /**
   * Resolved IService objects for the currently active package.
   * When the conditional is enabled, merges root services + conditional service.
   */
  activeServices(view: IPackageView): IService[] {
    if (view.conditionalEnabled && view.childPkg) {
      const childServices = (view.childPkg.service_ids ?? []).reduce<IService[]>((acc, id) => {
        const svc = this.services.find(s => s.service_id === id);
        if (svc) acc.push(svc);
        return acc;
      }, []);
      // Merge root + child, de-duplicating by service_id.
      const seen = new Set(view.rootServices.map(s => s.service_id));
      const merged = [...view.rootServices];
      for (const svc of childServices) {
        if (!seen.has(svc.service_id)) merged.push(svc);
      }
      return merged;
    }
    return view.rootServices;
  }

  // ── Discount gate ─────────────────────────────────────────────────────────
  enabledAddonCount(view: IPackageView): number {
    return view.addonStates.filter(s => s.enabled).length;
  }

  discountUnlocked(view: IPackageView): boolean {
    return this.enabledAddonCount(view) >= MIN_ADDONS_FOR_DISCOUNT;
  }

  addonsNeededForDiscount(view: IPackageView): number {
    return Math.max(0, MIN_ADDONS_FOR_DISCOUNT - this.enabledAddonCount(view));
  }

  // ── Price helpers ─────────────────────────────────────────────────────────

  /**
   * Base price = sum of all root service prices.
   * When the conditional is enabled, the conditional service price is added too.
   * Falls back to summing addon service prices if the package has no service_ids.
   */
  basePrice(view: IPackageView): number {
    const svcIds = view.pkg.service_ids ?? [];

    // Fallback: derive from addon service IDs when package has no service_ids.
    if (svcIds.length === 0) {
      const uniqueIds = [...new Set(
        view.addonStates.map(s => s.addon.service_id).filter((id): id is number => id != null)
      )];
      return uniqueIds.reduce((sum, id) => {
        const svc = this.services.find(s => s.service_id === id);
        return sum + (svc?.Price ?? 0);
      }, 0);
    }

    // Normal path: sum all root service prices.
    const rootTotal = svcIds.reduce((sum, id) => {
      const svc = this.services.find(s => s.service_id === id);
      return sum + (svc?.Price ?? 0);
    }, 0);

    // Add conditional service price when toggled on.
    const conditionalPrice = (view.conditionalEnabled && view.conditionalService)
      ? (view.conditionalService.Price ?? 0)
      : 0;

    return rootTotal + conditionalPrice;
  }

  enabledAddonTotal(view: IPackageView): number {
    return view.addonStates
      .filter(s => s.enabled)
      .reduce((sum, s) => sum + s.addon.Price, 0);
  }

  fullTotal(view: IPackageView): number {
    return this.basePrice(view) + this.enabledAddonTotal(view);
  }

  discountedTotal(view: IPackageView): number {
    if (!this.discountUnlocked(view)) return this.fullTotal(view);
    const discount = this.activePkg(view).Discount ?? 0;
    return Math.round(this.fullTotal(view) * (1 - discount));
  }

  saving(view: IPackageView): number {
    return this.fullTotal(view) - this.discountedTotal(view);
  }

  formatPrice(n: number): string {
    return n.toLocaleString('en-ZA');
  }

  // ── Ghost skeleton helpers ────────────────────────────────────────────────
  skeletonCards = Array(3).fill(null);
  skeletonPackages = Array(2).fill(null);
}
