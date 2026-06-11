export interface IService {
  service_id: number;
  serviceName: string;
  price: number;           // default 3000.00
  hasAddons: boolean;      // default false
  serviceDescription: string;
  conditional: boolean; // default false, used in conditions if set in config to use parent package or other.
  /** High-level bullet points shown on the services page card and service sub-page */
  features: string[];
}

export interface IAddon {
  addon_id: number;
  service_id: number | null;
  addonName: string;
  addonDescription: string;
  price: number;           // default 200.00
}

export interface IPackage {
  package_id: number;
  parent_package_id?: number; // conditional FK to allow nested packages
  /** One or more service IDs this package is composed of */
  service_ids?: number[];
  packageName: string;
  packageDescription: string;
  discount: number;        // 0–1 (percentage)
  /**
   * Minimum number of add-ons that must be enabled before the bundle
   * discount is applied. When undefined or 0, the discount is always active
   * regardless of how many add-ons are selected.
   */
  minimumRequiredAddons?: number;
}

/**
 * A company (business entity) that belongs to a user.
 * A single user (client) may own multiple companies, each with their
 * own set of active services.
 */
export interface ICompany {
  company_id: number;
  user_id: number;             // FK → IUser.user_id
  companyName: string;
  industry?: string | null;
  VATNumber?: string | null;
  registrationNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  active: boolean;
}

export interface IUser {
  user_id: number;
  username: string;
  password: string;
  firstName: string;
  surname: string;
  email: string;
  cellNumber: string | null;
  active: boolean;
  isAdmin: boolean;
  /** Optional profile picture URL or base64 data URI */
  profilePicture?: string | null;
}

export type UserServiceStatus = 0 | 1 | 2 | 3;
// 0 = Disabled | 1 = In Development | 2 = Live | 3 = Pending

export interface IUserService {
  company_id: number;          // FK → ICompany.company_id (replaces user_id)
  service_id: number;
  package_id: number | null;
  subscription_id: string | null;
  config: string;              // JSON string
  active: boolean;             // default true
  status: UserServiceStatus;   // default 1
}

export interface IServiceConfig {
  service_config_id: number;
  company_id: number;
  service_id: number;
  config: string;              // JSON string
}
