export interface IUser {
  userId: number;
  username: string;
  firstName: string;
  surname: string;
  email: string;
  cellNumber?: string;
  active: boolean;
  isAdmin: boolean;
  isDev: boolean;
  referral?: string;
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
  subscriptionAmount?: number;
  pricingSnapshot?: string;
  paymentDate?: string;
  dueDate?: string;
  createdAt?: string;
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

export interface IDevServiceAssignment {
  devServiceId?: number;
  userId?: number;
  userServiceId: number;
  developerName?: string;
  developerEmail?: string;
  referral?: string;
  companyId: number;
  companyName: string;
  serviceId: number;
  serviceName: string;
  subscriptionId?: string;
  status: UserServiceStatus;
  commissionPerc: number;
  cost: number;
  totalCommission: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface IDevPortalService {
  devServiceId?: number;
  userId?: number;
  userServiceId: number;
  companyId: number;
  companyName: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  serviceId: number;
  serviceName: string;
  serviceDescription?: string;
  subscriptionId?: string;
  status: UserServiceStatus;
  config?: string;
  pricingSnapshot?: string;
  guideStep: number;
  isMaintenance: boolean;
  subscriptionAmount: number;
  commissionPerc: number;
  totalCommission: number;
  isActive: boolean;
  createdAt: string;
  dueDate?: string;
  paymentDate?: string;
}

export interface IDevDashboard {
  assignedCount: number;
  liveCount: number;
  inDevelopmentCount: number;
  pendingCount: number;
  monthlySubscriptionTotal: number;
  monthlyCommissionTotal: number;
  recentAssigned: IDevPortalService[];
}

export interface ICreateDevServiceAssignment {
  userId: number;
  userServiceId: number;
  commissionPerc: number;
  cost: number;
}

export interface IUpdateDevServiceAssignment {
  userId: number;
  commissionPerc: number;
  cost: number;
  isActive: boolean;
}
