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
