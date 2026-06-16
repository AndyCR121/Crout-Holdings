import { IService, IAddon, IPackage } from './i-service.interface';

/** Accent palette slot — resolved by index % 2 */
export type ServiceAccent = 'orange' | 'blue';

/** Extends IService with display-specific metadata */
export interface IServiceDisplay extends IService {
  slug: string;
  icon: string;          // SVG string
  label: string;         // human-readable label (may differ from ServiceName)
  tagline: string;
  features: string[];
  accent: ServiceAccent;
}

/** Runtime addon state used in the pricing configurator */
export interface IAddonState {
  addon: IAddon;
  enabled: boolean;
  /** True for child addons injected when the conditional service is enabled */
  isConditionalChild?: boolean;
}

/** A package with its resolved addons and toggle state */
export interface IPackageView {
  pkg: IPackage;
  /** child package (parent_package_id points here from a child) */
  childPkg: IPackage | null;
  /** The conditional service linked to the child package */
  conditionalService: IService | null;
  /** Whether the conditional (child) package is currently active */
  conditionalEnabled: boolean;
  /**
   * The stable merged addon list.
   * Root addons keep their original indices at all times.
   * When conditionalEnabled, child addons are appended after root addons.
   */
  addonStates: IAddonState[];
  /**
   * The root-only addon states — stable source of truth aggregated across
   * ALL service_ids on the root package. Never mutated after buildViews().
   */
  rootAddonStates: IAddonState[];
  /**
   * Addon states for the child package's services — populated once on the
   * first conditional toggle and preserved across subsequent toggles.
   */
  childAddonStates: IAddonState[];
  /**
   * -1 when there is no conditional service; otherwise the index within
   * rootAddonStates after which child addons are spliced.
   */
  conditionalIndex: number;
  /**
   * Resolved IService objects for every service_id in the root package,
   * cached here so the template can iterate them without extra lookups.
   */
  rootServices: IService[];
}
