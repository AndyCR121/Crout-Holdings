import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServiceTriggerApiService } from '../../services/service-trigger-api.service';
import { DynamicFieldConfig, ExecuteTriggerResponse, ServiceTriggerConfig } from '../../interfaces/i-service-trigger.interface';
import {
  CustomFormCheckboxElement,
  CustomFormDateTimeElement,
  CustomFormElement,
  CustomFormInputElement,
  CustomFormListElement,
  CustomFormListItemField,
  CustomFormSelectElement,
  CustomFormTab,
} from '../../interfaces/i-custom-form-builder.interface';

@Component({
  selector: 'ca-service-trigger-renderer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './service-trigger-renderer.component.html',
  styleUrl: './service-trigger-renderer.component.scss'
})
export class ServiceTriggerRendererComponent implements OnChanges {
  private readonly triggerApi = inject(ServiceTriggerApiService);

  @Input({ required: true }) configs: ServiceTriggerConfig[] = [];
  @Input({ required: true }) companyId!: number;
  @Input() userServiceId: number | null = null;
  @Input() previewOnly = false;
  @Output() executed = new EventEmitter<ExecuteTriggerResponse>();

  readonly values = signal<Record<number, Record<string, any>>>({});
  readonly files = signal<Record<number, File[]>>({});
  readonly busy = signal<number | null>(null);
  readonly errors = signal<Record<number, string>>({});
  readonly responses = signal<Record<number, ExecuteTriggerResponse>>({});
  readonly selectedConfigId = signal<number | null>(null);
  readonly activeTabs = signal<Record<number, string | null>>({});
  readonly revealedSecrets = signal<Record<string, boolean>>({});

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['configs']) {
      const next: Record<number, Record<string, any>> = {};
      const nextTabs: Record<number, string | null> = {};
      for (const config of this.configs) {
        next[config.id] = this.defaultValues(config);
        const tabs = this.formTabs(config);
        const configuredTabId = config.activeTabId;
        nextTabs[config.id] = configuredTabId && tabs.some(tab => tab.id === configuredTabId)
          ? configuredTabId
          : tabs[0]?.id ?? null;
      }
      this.values.set(next);
      this.activeTabs.set(nextTabs);
      const currentSelected = this.selectedConfigId();
      const stillExists = currentSelected !== null && this.configs.some(config => config.id === currentSelected);
      this.selectedConfigId.set(stillExists ? currentSelected : (this.configs[0]?.id ?? null));
    }
  }

  selectConfig(configId: number): void {
    this.selectedConfigId.set(configId);
  }

  activeConfig(): ServiceTriggerConfig | null {
    const selectedId = this.selectedConfigId();
    if (selectedId === null) return this.configs[0] ?? null;
    return this.configs.find(config => config.id === selectedId) ?? this.configs[0] ?? null;
  }

  fieldValue(configId: number, key: string): any {
    return this.values()[configId]?.[key];
  }

  setField(configId: number, key: string, value: any): void {
    this.values.update(current => ({
      ...current,
      [configId]: {
        ...(current[configId] ?? {}),
        [key]: value
      }
    }));
  }

  setCheckbox(configId: number, key: string, checked: boolean): void {
    this.setField(configId, key, checked);
  }

  setMulti(configId: number, key: string, value: unknown, checked: boolean): void {
    const current = Array.isArray(this.fieldValue(configId, key)) ? [...this.fieldValue(configId, key)] : [];
    const idx = current.findIndex(item => item === value);
    if (checked && idx === -1) current.push(value);
    if (!checked && idx > -1) current.splice(idx, 1);
    this.setField(configId, key, current);
  }

  setDateRangePart(configId: number, key: string, part: 'start' | 'end', value: string): void {
    const current = this.fieldValue(configId, key);
    this.setField(configId, key, {
      start: current?.start ?? '',
      end: current?.end ?? '',
      [part]: value,
    });
  }

  onFiles(config: ServiceTriggerConfig, event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files ?? []);
    const validation = this.validateFiles(config, selected);
    if (validation) {
      this.setError(config.id, validation);
      input.value = '';
      return;
    }
    this.clearError(config.id);
    this.files.update(current => ({ ...current, [config.id]: selected }));
  }

  execute(config: ServiceTriggerConfig): void {
    const validation = this.validate(config);
    if (validation) {
      this.setError(config.id, validation);
      return;
    }

    if (config.requiresConfirmation && !confirm(`Run ${config.label}?`)) return;

    this.clearError(config.id);
    this.busy.set(config.id);
    const payload = this.buildPayload(config);
    const selectedFiles = this.files()[config.id] ?? [];
    this.triggerApi.execute(config.id, this.companyId, this.userServiceId, payload, selectedFiles).subscribe({
      next: response => {
        this.responses.update(current => ({ ...current, [config.id]: response }));
        this.executed.emit(response);
        this.busy.set(null);
      },
      error: err => {
        this.setError(config.id, err?.error?.error ?? err?.message ?? 'Trigger failed.');
        this.busy.set(null);
      }
    });
  }

  selectedFiles(configId: number): File[] {
    return this.files()[configId] ?? [];
  }

  response(configId: number): ExecuteTriggerResponse | undefined {
    return this.responses()[configId];
  }

  error(configId: number): string | undefined {
    return this.errors()[configId];
  }

  usesCustomFormLayout(config: ServiceTriggerConfig): boolean {
    return config.triggerType === 'form' && !!config.formSchema?.elements?.length;
  }

  formTabs(config: ServiceTriggerConfig): CustomFormTab[] {
    const tabsElement = config.formSchema?.elements.find((element): element is Extract<CustomFormElement, { type: 'tabs' }> => element.type === 'tabs');
    return tabsElement?.tabs ?? [];
  }

  activeTabId(configId: number): string | null {
    return this.activeTabs()[configId] ?? null;
  }

  selectTab(configId: number, tabId: string): void {
    this.activeTabs.update(current => ({ ...current, [configId]: tabId }));
  }

  visibleElements(config: ServiceTriggerConfig): CustomFormElement[] {
    const activeTabId = this.activeTabId(config.id);
    return (config.formSchema?.elements ?? []).filter(element => {
      if (element.type === 'tabs') return false;
      if (!element.tabId) return true;
      return element.tabId === activeTabId;
    });
  }

  isInputElement(element: CustomFormElement): element is CustomFormInputElement {
    return element.type === 'input';
  }

  isSelectElement(element: CustomFormElement): element is CustomFormSelectElement {
    return element.type === 'select';
  }

  isDateTimeElement(element: CustomFormElement): element is CustomFormDateTimeElement {
    return element.type === 'datetime';
  }

  isCheckboxElement(element: CustomFormElement): element is CustomFormCheckboxElement {
    return element.type === 'checkbox';
  }

  isListElement(element: CustomFormElement): element is CustomFormListElement {
    return element.type === 'list';
  }

  customInputType(element: CustomFormInputElement, revealed = false): string {
    if (element.inputMode === 'number') return 'number';
    if (element.inputMode === 'email') return 'email';
    if (element.inputMode === 'password') return revealed ? 'text' : 'password';
    return 'text';
  }

  isSecretInput(element: CustomFormInputElement): boolean {
    return element.inputMode === 'password';
  }

  isSecretRevealed(configId: number, elementId: string): boolean {
    return this.revealedSecrets()[`${configId}:${elementId}`] === true;
  }

  toggleSecretVisibility(configId: number, elementId: string): void {
    const key = `${configId}:${elementId}`;
    this.revealedSecrets.update(values => ({ ...values, [key]: !values[key] }));
  }

  canExecute(config: ServiceTriggerConfig): boolean {
    return this.validate(config) === null;
  }

  customDateTimeInputType(element: CustomFormDateTimeElement): string {
    if (element.dateTimeMode === 'date') return 'date';
    if (element.dateTimeMode === 'time') return 'time';
    return 'datetime-local';
  }

  customFieldValue(configId: number, key: string): any {
    return this.fieldValue(configId, key);
  }

  setCustomFieldValue(configId: number, key: string, value: any): void {
    this.setField(configId, key, value);
  }

  setCustomDateRangePart(configId: number, key: string, part: 'start' | 'end', value: string): void {
    this.setDateRangePart(configId, key, part, value);
  }

  listItems(configId: number, element: CustomFormListElement): Record<string, any>[] {
    const current = this.fieldValue(configId, element.key);
    return Array.isArray(current) ? current : [];
  }

  addListItem(configId: number, element: CustomFormListElement): void {
    const current = this.listItems(configId, element);
    this.setField(configId, element.key, [...current, this.defaultListItem(element)]);
  }

  removeListItem(configId: number, element: CustomFormListElement, index: number): void {
    const current = [...this.listItems(configId, element)];
    current.splice(index, 1);
    this.setField(configId, element.key, current);
  }

  listFieldValue(configId: number, listKey: string, index: number, fieldKey: string): any {
    return this.listValuesByKey(configId, listKey)[index]?.[fieldKey];
  }

  setListFieldValue(configId: number, listKey: string, index: number, fieldKey: string, value: any): void {
    const current = [...this.listValuesByKey(configId, listKey)];
    current[index] = { ...(current[index] ?? {}), [fieldKey]: value };
    this.setField(configId, listKey, current);
  }

  setListDateRangePart(configId: number, listKey: string, index: number, fieldKey: string, part: 'start' | 'end', value: string): void {
    const current = this.listFieldValue(configId, listKey, index, fieldKey);
    this.setListFieldValue(configId, listKey, index, fieldKey, {
      start: current?.start ?? '',
      end: current?.end ?? '',
      [part]: value
    });
  }

  toggleListMulti(configId: number, listKey: string, index: number, fieldKey: string, optionValue: unknown, checked: boolean): void {
    const current = Array.isArray(this.listFieldValue(configId, listKey, index, fieldKey))
      ? [...this.listFieldValue(configId, listKey, index, fieldKey)]
      : [];
    const existingIndex = current.findIndex(item => item === optionValue);
    if (checked && existingIndex === -1) current.push(optionValue);
    if (!checked && existingIndex > -1) current.splice(existingIndex, 1);
    this.setListFieldValue(configId, listKey, index, fieldKey, current);
  }

  trackListItem(index: number): number {
    return index;
  }

  trackListField(_index: number, field: CustomFormListItemField): string {
    return field.key;
  }

  normalizeCustomInputMode(mode: CustomFormInputElement['inputMode']): DynamicFieldConfig['type'] {
    if (mode === 'textarea') return 'textarea';
    if (mode === 'richText') return 'richText';
    if (mode === 'number') return 'number';
    if (mode === 'email') return 'email';
    if (mode === 'hidden') return 'hidden';
    return 'text';
  }

  normalizeCustomDateMode(mode: CustomFormDateTimeElement['dateTimeMode']): DynamicFieldConfig['type'] {
    if (mode === 'date') return 'date';
    if (mode === 'time') return 'time';
    if (mode === 'dateRange') return 'dateRange';
    return 'datetime';
  }

  private defaultValues(config: ServiceTriggerConfig): Record<string, any> {
    if (config.triggerType === 'email_mockup') {
      return { to: '', cc: '', bcc: '', subject: '', body: '', previewMode: true };
    }

    if (this.usesCustomFormLayout(config)) {
      return (config.formSchema?.elements ?? []).reduce<Record<string, any>>((acc, element) => {
        if (element.type === 'tabs' || element.type === 'header' || element.type === 'paragraph' || element.type === 'divider') {
          return acc;
        }
        if (element.type === 'list') {
          acc[element.key] = [];
          return acc;
        }
        if (element.type === 'input') {
          acc[element.key] = element.defaultValueText ?? '';
          return acc;
        }
        if (element.type === 'select') {
          acc[element.key] = element.selectMode === 'multiSelect' ? [] : (element.defaultValueText ?? '');
          return acc;
        }
        if (element.type === 'datetime') {
          acc[element.key] = element.dateTimeMode === 'dateRange'
            ? { start: '', end: '' }
            : (element.defaultValueText ?? '');
          return acc;
        }
        if (element.type === 'checkbox') {
          acc[element.key] = element.checkboxMode === 'radio'
            ? ''
            : element.options.length > 1 ? [] : false;
          return acc;
        }
        return acc;
      }, {});
    }

    return (config.fields ?? []).reduce<Record<string, any>>((acc, field) => {
      const type = this.normalizeFieldType(field.type);
      if (field.defaultValue !== undefined) acc[field.key] = field.defaultValue;
      else if (type === 'checkbox' || type === 'toggle') acc[field.key] = false;
      else if (type === 'multi-select') acc[field.key] = [];
      else if (type === 'dateRange') acc[field.key] = { start: '', end: '' };
      else acc[field.key] = '';
      return acc;
    }, {});
  }

  private buildPayload(config: ServiceTriggerConfig): Record<string, unknown> {
    const fieldMap = new Map((config.fields ?? []).map(field => [field.key, field]));
    const values = Object.entries(this.values()[config.id] ?? {}).reduce<Record<string, unknown>>((acc, [key, value]) => {
      const field = fieldMap.get(key);
      if (field && this.normalizeFieldType(field.type) === 'json' && typeof value === 'string' && value.trim()) {
        acc[key] = JSON.parse(value);
      } else {
        acc[key] = value;
      }
      return acc;
    }, {});

    return {
      ...(config.payloadTemplate ?? {}),
      ...values,
      triggerLabel: config.label
    };
  }

  private validate(config: ServiceTriggerConfig): string | null {
    if (config.triggerType === 'email_mockup') {
      const value = this.values()[config.id] ?? {};
      if (!value['to'] || !value['subject']) return 'To and subject are required.';
      return null;
    }

    if (this.usesCustomFormLayout(config)) {
      return this.validateCustomForm(config);
    }

    for (const field of config.fields ?? []) {
      const type = this.normalizeFieldType(field.type);
      const value = this.fieldValue(config.id, field.key);
      const isEmptyDateRange = type === 'dateRange' && (!value?.start || !value?.end);
      if (field.required && (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0) || isEmptyDateRange)) {
        return `${field.label} is required.`;
      }
      const validation = this.validateField(field, value);
      if (validation) return validation;
    }

    if (config.triggerType === 'file_upload' && !this.selectedFiles(config.id).length) {
      return 'Select at least one file.';
    }
    return null;
  }

  private validateField(field: DynamicFieldConfig, value: any): string | null {
    if (value === null || value === undefined || value === '') return null;
    const type = this.normalizeFieldType(field.type);
    if (type === 'dateRange') {
      if (!value?.start || !value?.end) return null;
      const preventEndBeforeStart = field.validation?.preventEndBeforeStart ?? true;
      if (preventEndBeforeStart && value.end < value.start) return `${field.label} end date cannot be earlier than the start date.`;
      return null;
    }
    if (type === 'json') {
      try {
        JSON.parse(String(value));
        return null;
      } catch {
        return `${field.label} must be valid JSON.`;
      }
    }
    const rules = field.validation;
    if (!rules) return null;
    if (rules.maxLength && String(value).length > rules.maxLength) return `${field.label} is too long.`;
    if (rules.regex) {
      try {
        if (!new RegExp(rules.regex).test(String(value))) return `${field.label} is invalid.`;
      } catch {
        return `${field.label} has an invalid validation pattern.`;
      }
    }
    const numericValue = typeof value === 'number' ? value : (type === 'number' && value !== '' ? Number(value) : null);
    if (numericValue !== null && !Number.isNaN(numericValue)) {
      if (rules.min !== undefined && numericValue < rules.min) return `${field.label} is below the minimum.`;
      if (rules.max !== undefined && numericValue > rules.max) return `${field.label} is above the maximum.`;
    }
    return null;
  }

  private validateCustomForm(config: ServiceTriggerConfig): string | null {
    for (const element of config.formSchema?.elements ?? []) {
      if (element.type === 'tabs' || element.type === 'header' || element.type === 'paragraph' || element.type === 'divider') {
        continue;
      }

      if (element.type === 'list') {
        const items = this.listItems(config.id, element);
        for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
          for (const field of element.fields) {
            const value = items[itemIndex]?.[field.key];
            const dynamicField = this.asDynamicField(field);
            if (dynamicField.required && (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0))) {
              return `${field.label} is required for ${element.itemLabel || 'item'} ${itemIndex + 1}.`;
            }
            const validation = this.validateField(dynamicField, value);
            if (validation) return validation;
          }
        }
        continue;
      }

      const value = this.fieldValue(config.id, element.key);
      const dynamicField = this.asDynamicField(element);
      const isEmptyDateRange = dynamicField.type === 'dateRange' && (!value?.start || !value?.end);
      if (dynamicField.required && (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0) || isEmptyDateRange)) {
        return `${element.label} is required.`;
      }
      const validation = this.validateField(dynamicField, value);
      if (validation) return validation;
    }

    return null;
  }

  private asDynamicField(field: CustomFormInputElement | CustomFormSelectElement | CustomFormDateTimeElement | CustomFormCheckboxElement | CustomFormListItemField): DynamicFieldConfig {
    if (field.type === 'input') {
      return {
        key: field.key,
        label: field.label,
        type: this.normalizeCustomInputMode(field.inputMode),
        required: field.required,
        hidden: field.hidden,
        placeholder: field.placeholder,
        validation: this.normalizeValidation(field.validation)
      };
    }
    if (field.type === 'select') {
      return {
        key: field.key,
        label: field.label,
        type: field.selectMode === 'multiSelect' ? 'multi-select' : 'select',
        required: field.required,
        placeholder: field.placeholder,
        options: field.options.map(option => ({ label: option.label, value: option.value }))
      };
    }
    if (field.type === 'datetime') {
      return {
        key: field.key,
        label: field.label,
        type: this.normalizeCustomDateMode(field.dateTimeMode),
        required: field.required,
        placeholder: field.placeholder
      };
    }
    return {
      key: field.key,
      label: field.label,
      type: field.options.length > 1 ? 'multi-select' : 'checkbox',
      required: field.required,
      hidden: field.hidden,
      options: field.options.map(option => ({ label: option.label, value: option.value }))
    };
  }

  private listValuesByKey(configId: number, listKey: string): Record<string, any>[] {
    const current = this.fieldValue(configId, listKey);
    return Array.isArray(current) ? current : [];
  }

  private normalizeValidation(validation: { min?: number | null; max?: number | null; regex?: string; maxLength?: number | null } | undefined): DynamicFieldConfig['validation'] {
    if (!validation) return undefined;
    return {
      min: validation.min ?? undefined,
      max: validation.max ?? undefined,
      regex: validation.regex,
      maxLength: validation.maxLength ?? undefined
    };
  }

  private defaultListItem(element: CustomFormListElement): Record<string, any> {
    return element.fields.reduce<Record<string, any>>((acc, field) => {
      if (field.type === 'input') {
        acc[field.key] = field.defaultValueText ?? '';
      } else if (field.type === 'select') {
        acc[field.key] = field.selectMode === 'multiSelect' ? [] : (field.defaultValueText ?? '');
      } else if (field.type === 'datetime') {
        acc[field.key] = field.dateTimeMode === 'dateRange' ? { start: '', end: '' } : (field.defaultValueText ?? '');
      } else {
        acc[field.key] = field.options.length > 1 ? [] : false;
      }
      return acc;
    }, {});
  }

  isHiddenField(field: DynamicFieldConfig): boolean {
    return field.hidden === true || this.normalizeFieldType(field.type) === 'hidden';
  }

  isChoiceField(field: DynamicFieldConfig): boolean {
    const type = this.normalizeFieldType(field.type);
    return type === 'select' || type === 'multi-select';
  }

  isDateRangeField(field: DynamicFieldConfig): boolean {
    return this.normalizeFieldType(field.type) === 'dateRange';
  }

  inputType(field: DynamicFieldConfig): string {
    const type = this.normalizeFieldType(field.type);
    if (type === 'datetime') return 'datetime-local';
    return type;
  }

  normalizeFieldType(type: DynamicFieldConfig['type']): string {
    return type === 'multiSelect' ? 'multi-select' : type;
  }

  private validateFiles(config: ServiceTriggerConfig, selected: File[]): string | null {
    const upload = config.fileUpload;
    if (!upload) return null;
    if (upload.maxCount && selected.length > upload.maxCount) return `Upload a maximum of ${upload.maxCount} files.`;
    for (const file of selected) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (upload.allowedExtensions?.length && !upload.allowedExtensions.includes(ext)) {
        return `${file.name} is not an allowed file type.`;
      }
      if (upload.maxSizeMb && file.size > upload.maxSizeMb * 1024 * 1024) {
        return `${file.name} exceeds ${upload.maxSizeMb}MB.`;
      }
    }
    return null;
  }

  private setError(configId: number, message: string): void {
    this.errors.update(current => ({ ...current, [configId]: message }));
  }

  private clearError(configId: number): void {
    this.errors.update(current => {
      const next = { ...current };
      delete next[configId];
      return next;
    });
  }
}
