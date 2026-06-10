import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IService, IAddon, IPackage } from '../../interfaces/i-service.interface';
import { IAddonState, IPackageView } from '../../interfaces/i-service-display.interface';

@Component({
  selector: 'ca-service-configurator',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './service-configurator.component.html',
  styleUrl: './service-configurator.component.scss'
})
export class ServiceConfiguratorComponent implements OnChanges {

  /** The single service this configurator is scoped to */
  @Input() services: IService[] = [];
  /** All addons (will be filtered to this service internally) */
  @Input() addons: IAddon[] = [];
  /** Packages scoped to this service (root + child) */
  @Input() packages: IPackage[] = [];
  /**
   * Full services list — needed to resolve conditional services that live
   * in a child package (the Conditional flag is on the IService row).
   */
  @Input() allServices: IService[] = [];
  /** Pass-through from parent so skeleton shows while parent is loading */
  @Input() loading = false;

  packageViews: IPackageView[] = [];

  readonly PACKAGE_DISCOUNT = 0.15;
  skeletonPackages = Array(1).fill(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.loading && this.packages.length > 0) {
      this.buildViews();
    }
  }

  // ── View builders ─────────────────────────────────────────────────────────
  private buildViews(): void {
    // All IDs that are child packages (pointed to by parent_package_id)
    const childIds = new Set(
      this.packages
        .filter(p => p.parent_package_id != null)
        .map(p => p.package_id!)
    );

    const rootPackages = this.packages.filter(p => !childIds.has(p.package_id));

    this.packageViews = rootPackages.map(pkg => {
      const childPkg = this.packages.find(p => p.parent_package_id === pkg.package_id) ?? null;

      // Resolve the conditional service from allServices (it has Conditional:true)
      const conditionalService: IService | null = childPkg
        ? (this.allServices.find(
            s => s.Conditional && (childPkg.service_ids ?? []).includes(s.service_id)
          ) ?? null)
        : null;

      // Root service rows
      const rootServices: IService[] = (pkg.service_ids ?? []).reduce<IService[]>((acc, id) => {
        const svc = this.allServices.find(s => s.service_id === id);
        if (svc) acc.push(svc);
        return acc;
      }, []);

      // Root addon states (non-conditional services' addons)
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
  toggleConditional(view: IPackageView): void {
    view.conditionalEnabled = !view.conditionalEnabled;

    if (view.conditionalEnabled && view.childPkg) {
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

  private buildMergedAddonList(view: IPackageView): IAddonState[] {
    if (!view.conditionalEnabled) return [...view.rootAddonStates];
    return [...view.rootAddonStates, ...view.childAddonStates];
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
        const svc = this.allServices.find(s => s.service_id === id);
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

  // ── Discount helpers ──────────────────────────────────────────────────────
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
        view.addonStates.map(s => s.addon.service_id).filter((id): id is number => id != null)
      )];
      return uniqueIds.reduce((sum, id) => {
        const svc = this.allServices.find(s => s.service_id === id);
        return sum + (svc?.Price ?? 0);
      }, 0);
    }

    const rootTotal = svcIds.reduce((sum, id) => {
      const svc = this.allServices.find(s => s.service_id === id);
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
}
