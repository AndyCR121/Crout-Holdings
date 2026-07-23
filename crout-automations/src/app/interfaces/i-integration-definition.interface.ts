import { DynamicFieldConfig } from './i-service-trigger.interface';

export interface IIntegrationDefinition {
  id: number;
  name: string;
  description?: string | null;
  integrationType: string;
  hasCredentials: boolean;
  credentialFormSchema?: {
    fields: DynamicFieldConfig[];
    n8nCredentialType?: string;
    managedNodeNames?: string[];
  } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

