import { DynamicFieldConfig, FileUploadConfig, ServiceTriggerResponseMode } from './i-service-trigger.interface';

export type WorkflowRole = 'Trigger' | 'Action' | 'Output';
export type WorkflowStepStatus = 'Pending' | 'Confirmed' | 'Failed' | 'Disabled';

export interface IWorkflowIntegrationDefinition {
  id: number;
  name: string;
  description?: string | null;
  integrationType: string;
  hasCredentials: boolean;
  credentialFormSchema?: { fields: DynamicFieldConfig[] } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IServiceWorkflowCapability {
  id: number;
  serviceId: number;
  role: WorkflowRole;
  capabilityType: string;
  name: string;
  description?: string | null;
  price: number;
  displayOrder: number;
  isActive: boolean;
  integrationId?: number | null;
  integrationName?: string | null;
  requiresCredentials: boolean;
  configurationSchema?: {
    workflowId?: string;
    endpointPath?: string;
    method?: 'POST' | 'GET';
    responseMode?: ServiceTriggerResponseMode;
    payloadTemplate?: Record<string, unknown>;
    fields?: DynamicFieldConfig[];
    fileUpload?: FileUploadConfig;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ICredentialFieldState {
  hasStoredValue: boolean;
  displayValue?: string | null;
}

export interface IUserServiceWorkflowStep {
  id: number;
  userServiceId: number;
  serviceId: number;
  serviceWorkflowCapabilityId: number;
  role: WorkflowRole;
  capabilityType: string;
  capabilityName: string;
  capabilityDescription?: string | null;
  integrationId?: number | null;
  integrationName?: string | null;
  status: WorkflowStepStatus;
  requiresCredentials: boolean;
  capabilityIsActive: boolean;
  integrationIsActive: boolean;
  configuration?: Record<string, unknown> | null;
  configurationSchema?: IServiceWorkflowCapability['configurationSchema'] | null;
  credentialSchema?: { fields: DynamicFieldConfig[] } | null;
  credentialFieldStates?: Record<string, ICredentialFieldState> | null;
  confirmedAt?: string | null;
  confirmedByUserId?: number | null;
  createdAt: string;
  updatedAt: string;
}
