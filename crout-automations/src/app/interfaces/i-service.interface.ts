export interface IService {
  service_id: number;
  ServiceName: string;
  Price: number;           // default 3000.00
  HasAddons: boolean;      // default false
  ServiceDescription: string;
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
  service_id: number;
  PackageName: string;
  PackageDescription: string;
  Discount: number;        // 0–1 (percentage)
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
