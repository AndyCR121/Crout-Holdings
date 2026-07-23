export type CustomFormResponseMode = 'inline' | 'toast' | 'modal' | 'download';
export type CustomFormElementType = 'input' | 'select' | 'datetime' | 'checkbox' | 'list' | 'header' | 'paragraph' | 'divider' | 'tabs';
export type CustomFormFieldFamily = 'input' | 'select' | 'datetime' | 'checkbox';

export interface CustomFormOption {
  id: string;
  label: string;
  value: string;
}

export interface CustomFormValidation {
  min?: number | null;
  max?: number | null;
  maxLength?: number | null;
  regex?: string;
}

export interface CustomFormBaseElement {
  id: string;
  type: CustomFormElementType;
  tabId?: string | null;
}

export interface CustomFormInputElement extends CustomFormBaseElement {
  type: 'input';
  inputMode: 'text' | 'textarea' | 'richText' | 'number' | 'email' | 'password' | 'hidden';
  key: string;
  name?: string;
  label: string;
  placeholder?: string;
  defaultValueText?: string;
  required?: boolean;
  hidden?: boolean;
  formatter?: '' | 'decimal' | 'currency' | 'phone' | 'email';
  validation?: CustomFormValidation;
}

export interface CustomFormSelectElement extends CustomFormBaseElement {
  type: 'select';
  selectMode: 'dropdown' | 'multiSelect' | 'cascading';
  key: string;
  name?: string;
  label: string;
  placeholder?: string;
  defaultValueText?: string;
  required?: boolean;
  searchable?: boolean;
  options: CustomFormOption[];
}

export interface CustomFormDateTimeElement extends CustomFormBaseElement {
  type: 'datetime';
  dateTimeMode: 'date' | 'time' | 'dateTime' | 'dateRange';
  key: string;
  name?: string;
  label: string;
  placeholder?: string;
  defaultValueText?: string;
  required?: boolean;
  minValue?: string;
  maxValue?: string;
  relativeMin?: string;
  relativeMax?: string;
}

export interface CustomFormCheckboxElement extends CustomFormBaseElement {
  type: 'checkbox';
  checkboxMode: 'checkbox' | 'radio';
  key: string;
  name?: string;
  label: string;
  required?: boolean;
  hidden?: boolean;
  options: CustomFormOption[];
  parentKey?: string;
}

export interface CustomFormListItemBaseField {
  id: string;
  type: CustomFormFieldFamily;
  key: string;
  name?: string;
  label: string;
}

export interface CustomFormListItemInputField extends CustomFormListItemBaseField {
  type: 'input';
  inputMode: 'text' | 'textarea' | 'number' | 'email' | 'password' | 'hidden';
  placeholder?: string;
  defaultValueText?: string;
  required?: boolean;
  hidden?: boolean;
  formatter?: '' | 'decimal' | 'currency' | 'phone' | 'email';
  validation?: CustomFormValidation;
}

export interface CustomFormListItemSelectField extends CustomFormListItemBaseField {
  type: 'select';
  selectMode: 'dropdown' | 'multiSelect' | 'cascading';
  placeholder?: string;
  defaultValueText?: string;
  required?: boolean;
  searchable?: boolean;
  options: CustomFormOption[];
}

export interface CustomFormListItemDateTimeField extends CustomFormListItemBaseField {
  type: 'datetime';
  dateTimeMode: 'date' | 'time' | 'dateTime' | 'dateRange';
  placeholder?: string;
  defaultValueText?: string;
  required?: boolean;
  minValue?: string;
  maxValue?: string;
  relativeMin?: string;
  relativeMax?: string;
}

export interface CustomFormListItemCheckboxField extends CustomFormListItemBaseField {
  type: 'checkbox';
  checkboxMode: 'checkbox' | 'radio';
  required?: boolean;
  hidden?: boolean;
  options: CustomFormOption[];
  parentKey?: string;
}

export type CustomFormListItemField =
  | CustomFormListItemInputField
  | CustomFormListItemSelectField
  | CustomFormListItemDateTimeField
  | CustomFormListItemCheckboxField;

export interface CustomFormListElement extends CustomFormBaseElement {
  type: 'list';
  key: string;
  name?: string;
  label: string;
  addButtonLabel?: string;
  emptyStateText?: string;
  itemLabel?: string;
  minItems?: number | null;
  maxItems?: number | null;
  fields: CustomFormListItemField[];
}

export interface CustomFormHeaderElement extends CustomFormBaseElement {
  type: 'header';
  text: string;
  level: 'h1' | 'h2' | 'h3';
}

export interface CustomFormParagraphElement extends CustomFormBaseElement {
  type: 'paragraph';
  text: string;
}

export interface CustomFormDividerElement extends CustomFormBaseElement {
  type: 'divider';
  dividerStyle: 'solid' | 'dashed';
}

export interface CustomFormTab {
  id: string;
  label: string;
}

export interface CustomFormTabsElement extends CustomFormBaseElement {
  type: 'tabs';
  tabs: CustomFormTab[];
  activeTabId?: string | null;
}

export type CustomFormElement =
  | CustomFormInputElement
  | CustomFormSelectElement
  | CustomFormDateTimeElement
  | CustomFormCheckboxElement
  | CustomFormListElement
  | CustomFormHeaderElement
  | CustomFormParagraphElement
  | CustomFormDividerElement
  | CustomFormTabsElement;

export interface CustomFormSchema {
  elements: CustomFormElement[];
}

export interface DevUserServiceForm {
  formId: number;
  userServiceId: number;
  label: string;
  description?: string | null;
  responseMode: CustomFormResponseMode;
  productionWebhookUrl?: string | null;
  payloadTemplate: Record<string, unknown>;
  schema: CustomFormSchema;
  schemaVersion: number;
  updatedAtUtc?: string | null;
}
