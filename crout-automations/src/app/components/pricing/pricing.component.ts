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

  // ── Loading state ──────────────────────────────────────────────────────────
  ghostLoaderOnLoad = signal<boolean>(true);

  // ── Raw data ───────────────────────────────────────────────────────────────
  services: IService[]  = [];
  addons:   IAddon[]    = [];
  packages: IPackage[]  = [];

  // ── Derived views ──────────────────────────────────────────────────────────
  /** Services where Conditional === false — shown as individual cards */
  visibleServices: IService[] = [];

  /** Capped at MAX_VISIBLE_SERVICES for the pricing section */
  visibleServicesLimited: IService[] = [];

  /** True when there are more services than MAX_VISIBLE_SERVICES */
  hasMoreServices = false;

  /** Root packages (no parent_package_id) — the ones we render */
  packageViews: IPackageView[] = [];

  // ── Monthly retainer (static) ──────────────────────────────────────────────
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

      const conditionalService = childPkg
        ? (this.services.find(s => s.Conditional && s.service_id === childPkg.service_id) ?? null)
        : null;

      const svcId = pkg.service_id;

      // Build the stable root addon list from the root package's service.
      const rootAddonStates: IAddonState[] = svcId
        ? this.addons
            .filter(a => a.service_id === svcId)
            .map(a => ({ addon: a, enabled: false }))
        : [];

      // The conditional index is the length of the root list — child addons
      // splice in after all root addons, keeping the conditional toggle row
      // (rendered separately in HTML) visually anchored.
      const conditionalIndex = conditionalService ? rootAddonStates.length : -1;

      return {
        pkg,
        childPkg,
        conditionalService,
        conditionalEnabled: false,
        rootAddonStates,
        childAddonStates: [],   // populated once on first conditional toggle
        conditionalIndex,
        addonStates: [...rootAddonStates], // initially mirrors root
      } satisfies IPackageView;
    });
  }

  // ── Toggle helpers ────────────────────────────────────────────────────────

  /**
   * Toggles the conditional (child) service on or off.
   *
   * Rules:
   * 1. Root addon states (and any user selections on them) are NEVER reset.
   * 2. Child addons are built once on the first enable, then reused on
   *    subsequent toggles — preserving the user's child-addon selections too.
   * 3. The merged addonStates list is rebuilt by appending child addons after
   *    the root list, so the conditional toggle row always stays at the same
   *    visual position in the HTML.
   */
  toggleConditional(view: IPackageView): void {
    view.conditionalEnabled = !view.conditionalEnabled;

    if (view.conditionalEnabled && view.childPkg) {
      // Build child addon states once; reuse on subsequent toggles.
      if (view.childAddonStates.length === 0) {
        const childSvcId = view.conditionalService?.service_id;
        if (childSvcId != null) {
          view.childAddonStates = this.addons
            .filter(a => a.service_id === childSvcId)
            .map(a => ({ addon: a, enabled: false, isConditionalChild: true }));
        }
      }
    }

    // Rebuild the merged list regardless of toggle direction.
    view.addonStates = this.buildMergedAddonList(view);
  }

  /**
   * Merges root and (optionally) child addon states into a stable list.
   *
   * OFF → root list only (child entries removed, root indices unchanged)
   * ON  → root list + child addons appended after rootAddonStates
   *
   * The conditional toggle ROW itself is rendered by the existing HTML block
   * and always appears after root addon rows, so appending child addons after
   * the root list keeps everything in the correct visual order.
   */
  private buildMergedAddonList(view: IPackageView): IAddonState[] {
    if (!view.conditionalEnabled) {
      // Conditional turned off — return clean copy of root only.
      return [...view.rootAddonStates];
    }
    // Conditional turned on — root addons first, child addons after.
    return [...view.rootAddonStates, ...view.childAddonStates];
  }

  toggleAddon(state: IAddonState): void {
    state.enabled = !state.enabled;
  }

  // ── Active package resolution ─────────────────────────────────────────────
  activePkg(view: IPackageView): IPackage {
    return view.conditionalEnabled && view.childPkg ? view.childPkg : view.pkg;
  }

  // ── Discount gate ─────────────────────────────────────────────────────────
  /** Number of add-ons currently toggled on for a package view */
  enabledAddonCount(view: IPackageView): number {
    return view.addonStates.filter(s => s.enabled).length;
  }

  /** True when enough add-ons are selected to unlock the bundle discount */
  discountUnlocked(view: IPackageView): boolean {
    return this.enabledAddonCount(view) >= MIN_ADDONS_FOR_DISCOUNT;
  }

  /** How many more add-ons the user needs to select to unlock the discount */
  addonsNeededForDiscount(view: IPackageView): number {
    return Math.max(0, MIN_ADDONS_FOR_DISCOUNT - this.enabledAddonCount(view));
  }

  // ── Price helpers ─────────────────────────────────────────────────────────

  /**
   * Base price calculation.
   *
   * Always uses the root package's own service price as the floor.
   * When the conditional service is enabled its price is added on top.
   * This ensures the price block never shows R0 when the package has a
   * service_id but no addons are selected.
   */
  basePrice(view: IPackageView): number {
    const rootSvcId = view.pkg.service_id;

    // Fallback: if root package has no service_id, derive from addon service IDs.
    if (!rootSvcId) {
      const allAddons = view.addonStates.map(s => s.addon);
      const svcIds = [...new Set(allAddons.map(a => a.service_id).filter((id): id is number => id != null))];
      return svcIds.reduce((sum, id) => {
        const svc = this.services.find(s => s.service_id === id);
        return sum + (svc?.Price ?? 0);
      }, 0);
    }

    // Normal path: root service price (always) + conditional service price (when on).
    const rootSvc = this.services.find(s => s.service_id === rootSvcId);
    const rootPrice = rootSvc?.Price ?? 0;

    const conditionalPrice = (view.conditionalEnabled && view.conditionalService)
      ? (view.conditionalService.Price ?? 0)
      : 0;

    return rootPrice + conditionalPrice;
  }

  enabledAddonTotal(view: IPackageView): number {
    return view.addonStates
      .filter(s => s.enabled)
      .reduce((sum, s) => sum + s.addon.Price, 0);
  }

  fullTotal(view: IPackageView): number {
    return this.basePrice(view) + this.enabledAddonTotal(view);
  }

  /**
   * Returns the discounted total only when the minimum add-on threshold is met.
   * Otherwise returns the full total (no discount applied).
   */
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
