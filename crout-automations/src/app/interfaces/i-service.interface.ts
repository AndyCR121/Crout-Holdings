import { IIntegrationDefinition } from './i-integration-definition.interface';

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
  baseCost: number;
  tokensCost: number;
  totalTokens: number;
  price: number;
  hasAddons: boolean;
  conditional: boolean;
  serviceDescription?: string;
  displayName?: string;
  displayTagline?: string;
  iconKey?: string;
  iconSvg?: string;
  displayOrder?: number;
  features?: string[];
  addons?: IAddon[];
}

export interface IReleaseNote {
  refRelease: number;
  releaseVersion: string;
  releaseDate: string;
  releaseNotes: string;
}

export interface IAddon {
  addonId: number;
  serviceId: number | null;
  serviceIds: number[];
  addonName: string;
  addonDescription?: string;
  type: 'Trigger' | 'Action' | 'Output';
  monthlyPrice: number;
  price: number;
  isActive: boolean;
  displayOrder: number;
  integrations?: IIntegrationDefinition[];
}

export interface IPricingComponent {
  pricingComponentId: number;
  componentKey: string;
  componentName: string;
  category: string;
  pricingType: string;
  amount: number;
  isRequiredDefault: boolean;
  isActive: boolean;
}

export interface IDeveloperReferralOption {
  userId: number;
  firstName: string;
  surname: string;
  referral: string;
}

export type IntegrationLifecycleStatus = 'Development' | 'Live' | 'Paused' | 'Failed';

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
  integrationStatus?: IntegrationLifecycleStatus | null;
  integrationWorkflowName?: string | null;
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
  integrationStatus?: IntegrationLifecycleStatus | null;
  integrationWorkflowName?: string | null;
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
  integrationStatus?: IntegrationLifecycleStatus | null;
  integrationWorkflowName?: string | null;
  integrationLastError?: string | null;
  integrationPublishedDate?: string | null;
  integrationPausedDate?: string | null;
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

export interface IAdminClientService {
  userServiceId: number;
  companyId: number;
  companyName: string;
  userId: number;
  clientName: string;
  clientEmail: string;
  serviceId: number;
  serviceName: string;
  packageId?: number;
  packageName?: string;
  subscriptionId?: string;
  config?: string;
  active: boolean;
  status: UserServiceStatus;
  subscriptionAmount: number;
  pricingSnapshot?: string;
  paymentDate?: string;
  dueDate?: string;
  createdAt: string;
  integrationStatus?: IntegrationLifecycleStatus | null;
  integrationWorkflowName?: string | null;
  integrationLastError?: string | null;
  integrationPublishedDate?: string | null;
  integrationPausedDate?: string | null;
}

export interface IAdminClientServiceUpsert {
  companyId: number;
  serviceId: number;
  packageId?: number | null;
  config?: string;
  active: boolean;
  status: UserServiceStatus;
  subscriptionAmount: number;
  subscriptionId?: string | null;
  paymentDate?: string | null;
  dueDate?: string | null;
}

export interface IAdminPaystackMapping {
  userServiceId: number;
  companyId: number;
  companyName: string;
  userId: number;
  clientName: string;
  clientEmail: string;
  serviceId: number;
  serviceName: string;
  packageId?: number;
  packageName?: string;
  subscriptionId?: string;
  subscriptionAmount: number;
  status: UserServiceStatus;
  active: boolean;
  mappingStatus: 'mapped' | 'unmapped' | 'failed' | 'needs_review';
  paymentDate?: string;
  dueDate?: string;
}

export interface IDatabaseManagementTarget {
  key: string;
  displayName: string;
  environmentName: string;
  serverLabel: string;
  databaseName: string;
  databaseLabel: string;
  allowSqlUpdates: boolean;
  allowMigrationSource: boolean;
  allowMigrationDestination: boolean;
}

export interface ISqlUpdaterScriptResult {
  fileName: string;
  status: string;
  durationMs: number;
  errorMessage?: string | null;
}

export interface ISqlUpdaterSummary {
  targetKey: string;
  targetDisplayName: string;
  environmentName: string;
  databaseTarget: string;
  dryRun: boolean;
  success: boolean;
  durationMs: number;
  startedAtUtc: string;
  endedAtUtc: string;
  discoveredScripts: string[];
  ignoredScripts: string[];
  pendingScripts: string[];
  executedScripts: string[];
  skippedScripts: string[];
  executionOrder: string[];
  failedScript?: string | null;
  errorMessage?: string | null;
  scriptResults: ISqlUpdaterScriptResult[];
}

export interface ISqlUpdatePreview {
  target: IDatabaseManagementTarget;
  preview: ISqlUpdaterSummary;
  latestResult?: ISqlUpdaterSummary | null;
}

export interface IMigrationSelection {
  targetKey: string;
  databaseNameOverride?: string | null;
}

export type SchemaDifferenceSeverity =
  | 'SafeAutoApply'
  | 'RequiresDataMigration'
  | 'ManualReviewRequired'
  | 'DestructiveBlocked';

export interface ISchemaCount {
  key: string;
  count: number;
}

export interface ISchemaDifference {
  category: string;
  severity: SchemaDifferenceSeverity;
  tableName: string;
  objectName?: string | null;
  sourceValue?: string | null;
  targetValue?: string | null;
  explanation: string;
  recommendedAction: string;
  canGenerateSql: boolean;
  generatedSql?: string | null;
}

export interface ISchemaSyncPlan {
  source?: IDatabaseManagementTarget | null;
  target?: IDatabaseManagementTarget | null;
  comparedAtUtc: string;
  readableSummary: string;
  approvalState: string;
  generatedMigrationFileName?: string | null;
  generatedSqlPreview: string;
  preflightChecks: string[];
  severityCounts: ISchemaCount[];
  categoryCounts: ISchemaCount[];
  differences: ISchemaDifference[];
}

export interface ISchemaComparisonResponse {
  plan?: ISchemaSyncPlan | null;
}

export interface IDatabaseMigrationValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  source?: IDatabaseManagementTarget | null;
  destination?: IDatabaseManagementTarget | null;
  sourceTableCount: number;
  destinationTableCount: number;
  destinationExists: boolean;
}

export interface IDatabaseMigrationStep {
  name: string;
  status: string;
  message?: string | null;
  startedAtUtc: string;
  completedAtUtc?: string | null;
}

export interface IDatabaseMigrationSummary {
  sourceDatabaseLabel: string;
  destinationDatabaseLabel: string;
  success: boolean;
  startedAtUtc: string;
  endedAtUtc: string;
  sourceTableCount: number;
  destinationTableCount: number;
  tablesRecreated: number;
  viewsRecreated: number;
  rowsCopied: number;
  errorMessage?: string | null;
}

export interface IDatabaseMigrationOperation {
  operationId: string;
  status: string;
  createdAtUtc: string;
  startedAtUtc?: string | null;
  completedAtUtc?: string | null;
  source?: IDatabaseManagementTarget | null;
  destination?: IDatabaseManagementTarget | null;
  errorMessage?: string | null;
  validation?: IDatabaseMigrationValidation | null;
  summary?: IDatabaseMigrationSummary | null;
  steps: IDatabaseMigrationStep[];
}
