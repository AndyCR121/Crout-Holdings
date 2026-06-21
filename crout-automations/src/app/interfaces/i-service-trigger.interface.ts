export type ServiceTriggerType = 'webhook' | 'form' | 'email_mockup' | 'file_upload' | 'custom';
export type ServiceTriggerResponseMode = 'toast' | 'modal' | 'inline' | 'download';
export type DynamicFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multi-select'
  | 'checkbox'
  | 'toggle'
  | 'email'
  | 'json'
  | 'hidden';

export interface DynamicFieldOption {
  label: string;
  value: unknown;
}

export interface DynamicFieldConfig {
  key: string;
  label: string;
  type: DynamicFieldType;
  required?: boolean;
  defaultValue?: unknown;
  placeholder?: string;
  options?: DynamicFieldOption[];
  validation?: {
    min?: number;
    max?: number;
    regex?: string;
    maxLength?: number;
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
}

export interface ExecuteTriggerResponse {
  executionId: number;
  status: string;
  mode: 'mock' | 'live';
  message: string;
  response?: Record<string, unknown>;
}
