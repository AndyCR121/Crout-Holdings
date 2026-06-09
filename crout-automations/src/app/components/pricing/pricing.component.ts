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
  visibleServices: IService[] = [];
  visibleServicesLimited: IService[] = [];
  hasMoreServices = false;
  packageViews: IPackageView[] = [];

  // ── Monthly retainer (static) ─────────────────────────────────────────────
  readonly retainerPrice = 1200;
  readonly PACKAGE_DISCOUNT = 0.15;

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void { this.onLoad(); }

  async onLoad(): Promise<void> {
    try {
      const [svcs, ads, pkgs] = await Promise.all([
        this.api.getServices().toPromise(),
        this.api.getAddons().toPromise(),
        this.api.getPackages().toPromise(),
      ]);
      if (svcs && ads && pkgs) {
        this.services = svcs;
        this.addons   = ads;
        this.packages = pkgs;
        this.buildViews();
        this.ghostLoaderOnLoad.set(false);
      }
    } catch (error: any) {
      console.error(error ? (error.message ?? error.error ?? error) : 'Something went wrong onLoad()!');
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
        .map(p => p.package_id!)
    );

    const rootPackages = this.packages.filter(p => !childIds.has(p.package_id));

    this.packageViews = rootPackages.map(pkg => {
      const childPkg = this.packages.find(p => p.parent_package_id === pkg.package_id) ?? null;

      const conditionalService: IService | null = childPkg
        ? (this.services.find(
            s => s.Conditional && (childPkg.service_ids ?? []).includes(s.service_id)
          ) ?? null)
        : null;

      const rootServices: IService[] = (pkg.service_ids ?? []).reduce<IService[]>((acc, id) => {
        const svc = this.services.find(s => s.service_id === id);
        if (svc) acc.push(svc);
        return acc;
      }, []);

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
        childAddonStates: [],
        conditionalIndex,
        addonStates: [...rootAddonStates],
      } satisfies IPackageView;
    });
  }

  // ── Toggle helpers ────────────────────────────────────────────────────────

  /**
   * Toggles the conditional (child) service on or off.
   *
   * ON  → switches to child package — replaces addonStates with child addons only.
   * OFF → switches back to root package — restores addonStates to root addons only.
   *
   * Child addon states are built fresh on every enable so the list is always
   * scoped to the child package's service_ids. User selections on the child
   * are preserved across toggles via childAddonStates.
   */
  toggleConditional(view: IPackageView): void {
    view.conditionalEnabled = !view.conditionalEnabled;

    if (view.conditionalEnabled && view.childPkg) {
      // Build child addon states once; reuse on subsequent re-enables.
      if (view.childAddonStates.length === 0) {
        view.childAddonStates = (view.childPkg.service_ids ?? []).flatMap(svcId =>
          this.addons
            .filter(a => a.service_id === svcId)
            .map(a => ({ addon: a, enabled: false, isConditionalChild: true }))
        );
      }
      // Active list = child addons only (child package replaces root).
      view.addonStates = [...view.childAddonStates];
    } else {
      // Active list = root addons only (restored cleanly, no child leftovers).
      view.addonStates = [...view.rootAddonStates];
    }
  }

  toggleAddon(state: IAddonState): void {
    state.enabled = !state.enabled;
  }

  // ── Active package resolution ─────────────────────────────────────────────
  activePkg(view: IPackageView): IPackage {
    return view.conditionalEnabled && view.childPkg ? view.childPkg : view.pkg;
  }

  activeServices(view: IPackageView): IService[] {
    if (view.conditionalEnabled && view.childPkg) {
      const childServices = (view.childPkg.service_ids ?? []).reduce<IService[]>((acc, id) => {
        const svc = this.services.find(s => s.service_id === id);
        if (svc) acc.push(svc);
        return acc;
      }, []);
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

  /**
   * Returns the minimum add-ons threshold for the active package.
   * When minimumRequiredAddons is undefined or 0, the discount is always
   * unlocked (no gating required).
   */
  private minAddonsRequired(view: IPackageView): number {
    return this.activePkg(view).minimumRequiredAddons ?? 0;
  }

  /**
   * True when the bundle discount is unlocked.
   * If minimumRequiredAddons is 0 / unset, always true.
   */
  discountUnlocked(view: IPackageView): boolean {
    const min = this.minAddonsRequired(view);
    return min === 0 || this.enabledAddonCount(view) >= min;
  }

  /** How many more add-ons the user needs to select to unlock the discount. */
  addonsNeededForDiscount(view: IPackageView): number {
    const min = this.minAddonsRequired(view);
    return Math.max(0, min - this.enabledAddonCount(view));
  }

  // ── Price helpers ─────────────────────────────────────────────────────────

  basePrice(view: IPackageView): number {
    const svcIds = view.pkg.service_ids ?? [];

    if (svcIds.length === 0) {
      const uniqueIds = [...new Set(
        view.addonStates.map(s => s.addon.service_id).filter((id): id is number => id != null)
      )];
      return uniqueIds.reduce((sum, id) => {
        const svc = this.services.find(s => s.service_id === id);
        return sum + (svc?.Price ?? 0);
      }, 0);
    }

    const rootTotal = svcIds.reduce((sum, id) => {
      const svc = this.services.find(s => s.service_id === id);
      return sum + (svc?.Price ?? 0);
    }, 0);

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
