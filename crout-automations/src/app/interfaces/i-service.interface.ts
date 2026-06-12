export interface IService {
  serviceId: number;
  serviceName: string;
  price: number;
  hasAddons: boolean;
  serviceDescription: string;
  conditional: boolean;
  features: string[];
}

export interface IAddon {
  addonId: number;
  serviceId: number | null;
  addonName: string;
  addonDescription: string;
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
  serviceIds: number[];
  packageName: string;
  packageDescription: string;
  discount: number;
  minimumRequiredAddons?: number;
}

export interface ICompany {
  companyId: number;
  userId: number;
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
  userId: number;
  username: string;
  password: string;
  firstName: string;
  surname: string;
  email: string;
  cellNumber: string | null;
  active: boolean;
  isAdmin: boolean;
  profilePicture?: string | null;
}

export type UserServiceStatus = 0 | 1 | 2 | 3;
// 0 = Disabled | 1 = In Development | 2 = Live | 3 = Pending

export interface IUserService {
  companyId: number;
  serviceId: number;
  packageId: number | null;
  subscriptionId: string | null;
  config: string;
  active: boolean;
  status: UserServiceStatus;
}

export interface IServiceConfig {
  serviceConfigId: number;
  companyId: number;
  serviceId: number;
  config: string;
}
