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
  /** True for the always-visible base-service row (locked on, not togglable) */
  isBase?: boolean;
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
   * When conditionalEnabled, child addons are spliced in directly after the
   * conditional toggle row (whose original index is stored in conditionalIndex).
   */
  addonStates: IAddonState[];
  /**
   * The root-only addon states, kept as the stable source of truth so that
   * toggling the conditional on/off never loses user selections on root addons.
   */
  rootAddonStates: IAddonState[];
  /**
   * Addon states for the child package's service — populated once the
   * conditional is first toggled on and preserved across subsequent toggles.
   */
  childAddonStates: IAddonState[];
  /**
   * The index within rootAddonStates where the conditional service row lives,
   * so child addons can always be inserted immediately after it.
   * -1 when there is no conditional service.
   */
  conditionalIndex: number;
}
