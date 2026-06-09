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
  /** Addons of the currently active package's service */
  addonStates: IAddonState[];
}
