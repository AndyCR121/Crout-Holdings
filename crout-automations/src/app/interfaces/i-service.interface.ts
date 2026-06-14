export interface IUser {
  userId: number;
  username: string;
  firstName: string;
  surname: string;
  email: string;
  cellNumber?: string;
  active: boolean;
  isAdmin: boolean;
  password?: string;
  createdAt?: string;
  profilePicture?: string;
}

export interface ICompany {
  companyId: number;
  userId: number;
  companyName: string;
  industry?: string;
  vatNumber?: string;
  registrationNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  active: boolean;
  createdAt?: string;
}

export interface IService {
  serviceId: number;
  serviceName: string;
  price: number;
  hasAddons: boolean;
  conditional: boolean;
  serviceDescription?: string;
  /** Alias used by admin forms — maps to serviceDescription on the API */
  description?: string;
  /** Whether the service is active/enabled */
  active?: boolean;
  features?: string[];
}

export interface IAddon {
  addonId: number;
  serviceId: number | null;
  addonName: string;
  addonDescription?: string;
  price: number;
}

export interface IServiceFeature {
  featureId: number;
  serviceId: number;
  feature: string;
  sortOrder: number;
}

export interface IPackage {
  packageId: number;
  parentPackageId?: number;
  packageName: string;
  packageDescription?: string;
  discount: number;
  minimumRequiredAddons?: number;
  serviceIds: number[];
}

export type UserServiceStatus = 0 | 1 | 2 | 3;
// 0 = Disabled | 1 = In Development | 2 = Live | 3 = Pending

/** Represents a service (and its selected addons) assigned to a company. */
export interface IUserService {
  userServiceId?: number;
  companyId: number;
  serviceId: number;
  packageId: number;
  addonIds: number[];
  active: boolean;
  service?: IService;
  addons?: IAddon[];
  config: string;
  status: UserServiceStatus;
  subscriptionId?: string;
}

/** Holds the selected addon IDs for a specific service in a company context. */
export interface IServiceConfig {
  serviceId: number;
  addonIds: number[];
}

export interface IPagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
