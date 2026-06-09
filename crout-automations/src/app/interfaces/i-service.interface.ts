export interface IService {
  service_id: number;
  ServiceName: string;
  Price: number;           // default 3000.00
  HasAddons: boolean;      // default false
  ServiceDescription: string;
  Conditional: boolean; // default false, used in conditions if set in config to use parent package or other.
}

export interface IAddon {
  addon_id: number;
  service_id: number | null;
  AddonName: string;
  AddonDescription: string;
  Price: number;           // default 200.00
}

export interface IPackage {
  package_id: number;
  parent_package_id?: number; // conditional FK to allow nested packages
  /** One or more service IDs this package is composed of */
  service_ids?: number[];
  PackageName: string;
  PackageDescription: string;
  Discount: number;        // 0–1 (percentage)
  /**
   * Minimum number of add-ons that must be enabled before the bundle
   * discount is applied. When undefined or 0, the discount is always active
   * regardless of how many add-ons are selected.
   */
  minimumRequiredAddons?: number;
}

export interface IUser {
  user_id: number;
  Username: string;
  Password: string;
  Company: string | null;
  FirstName: string;
  Surname: string;
  Email: string;
  CellNumber: string | null;
  Active: boolean;
  IsAdmin: boolean;
}

export type UserServiceStatus = 0 | 1 | 2 | 3;
// 0 = Disabled | 1 = In Development | 2 = Live | 3 = Pending

export interface IUserService {
  user_id: number;
  service_id: number;
  package_id: number | null;
  subscription_id: string | null;
  config: string;          // JSON string
  Active: boolean;         // default true
  Status: UserServiceStatus; // default 1
}

export interface IServiceConfig {
  service_config_id: number;
  user_id: number;
  service_id: number;
  config: string;          // JSON string
}
