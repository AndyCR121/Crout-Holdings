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
    // Services with Conditional === false only
    this.visibleServices = this.services.filter(s => !s.Conditional);

    // Cap display in pricing section
    this.hasMoreServices = this.visibleServices.length > MAX_VISIBLE_SERVICES;
    this.visibleServicesLimited = this.hasMoreServices
      ? this.visibleServices.slice(0, MAX_VISIBLE_SERVICES)
      : this.visibleServices;

    // Root packages = those not referenced as parent_package_id by anyone
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
      const addonStates: IAddonState[] = svcId
        ? this.addons
            .filter(a => a.service_id === svcId)
            .map(a => ({ addon: a, enabled: false }))
        : [];

      return {
        pkg,
        childPkg,
        conditionalService,
        conditionalEnabled: false,
        addonStates,
      } satisfies IPackageView;
    });
  }

  // ── Toggle helpers ────────────────────────────────────────────────────────
  toggleConditional(view: IPackageView): void {
    view.conditionalEnabled = !view.conditionalEnabled;

    if (view.conditionalEnabled && view.childPkg) {
      const childSvcId = view.conditionalService?.service_id;
      if (childSvcId != null) {
        view.addonStates = this.addons
          .filter(a => a.service_id === childSvcId)
          .map(a => ({ addon: a, enabled: false }));
      }
    } else if (!view.conditionalEnabled) {
      const rootSvcId = view.pkg.service_id;
      if (rootSvcId != null) {
        view.addonStates = this.addons
          .filter(a => a.service_id === rootSvcId)
          .map(a => ({ addon: a, enabled: false }));
      }
    }
  }

  toggleAddon(state: IAddonState): void {
    state.enabled = !state.enabled;
  }

  // ── Active package resolution ─────────────────────────────────────────────
  activePkg(view: IPackageView): IPackage {
    return view.conditionalEnabled && view.childPkg ? view.childPkg : view.pkg;
  }

  // ── Price helpers ─────────────────────────────────────────────────────────
  basePrice(view: IPackageView): number {
    const svcId = this.activePkg(view).service_id;
    if (!svcId) {
      const addonsOfPkg = view.addonStates.map(s => s.addon);
      const svcIds = [...new Set(addonsOfPkg.map(a => a.service_id).filter(id => id != null))] as number[];
      return svcIds.reduce((sum, id) => {
        const svc = this.services.find(s => s.service_id === id);
        return sum + (svc?.Price ?? 0);
      }, 0);
    }
    const svc = this.services.find(s => s.service_id === svcId);
    return svc?.Price ?? 3000;
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
