import { CustomFormSchema, CustomFormListItemField } from './i-custom-form-builder.interface';

export type ServiceTriggerType = 'webhook' | 'form' | 'email_mockup' | 'file_upload' | 'custom';
export type ServiceTriggerResponseMode = 'toast' | 'modal' | 'inline' | 'download';
export type DynamicFieldType =
  | 'text'
  | 'textarea'
  | 'richText'
  | 'number'
  | 'password'
  | 'url'
  | 'date'
  | 'time'
  | 'datetime'
  | 'dateRange'
  | 'select'
  | 'multi-select'
  | 'multiSelect'
  | 'checkbox'
  | 'toggle'
  | 'email'
  | 'json'
  | 'list'
  | 'hidden';

export type DynamicFieldFormatter = 'decimal' | 'currency' | 'phone' | 'email';

export interface DynamicFieldOption {
  label: string;
  value: unknown;
}

export interface DynamicFieldConfig {
  key: string;
  name?: string;
  label: string;
  type: DynamicFieldType;
  required?: boolean;
  hidden?: boolean;
  defaultValue?: unknown;
  placeholder?: string;
  formatter?: DynamicFieldFormatter;
  options?: DynamicFieldOption[];
  tabId?: string | null;
  listItemLabel?: string;
  addButtonLabel?: string;
  emptyStateText?: string;
  listFields?: CustomFormListItemField[];
  validation?: {
    min?: number;
    max?: number;
    regex?: string;
    maxLength?: number;
    preventEndBeforeStart?: boolean;
  };
}

export interface FileUploadConfig {
  allowedExtensions?: string[];
  maxSizeMb?: number;
  maxCount?: number;
}

export interface ServiceTriggerConfig {
  id: number;
  serviceId: number;
  userServiceId?: number | null;
  workflowId?: string;
  triggerType: ServiceTriggerType;
  label: string;
  description?: string;
  method: 'POST' | 'GET';
  requiresConfirmation?: boolean;
  payloadTemplate?: Record<string, unknown>;
  fields?: DynamicFieldConfig[];
  fileUpload?: FileUploadConfig;
  responseMode?: ServiceTriggerResponseMode;
  formSchema?: CustomFormSchema | null;
  activeTabId?: string | null;
}

export interface ExecuteTriggerResponse {
  executionId: number;
  status: string;
  mode: 'mock' | 'live';
  message: string;
  response?: Record<string, unknown>;
}
