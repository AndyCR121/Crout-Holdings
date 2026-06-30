import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServiceTriggerApiService } from '../../services/service-trigger-api.service';
import { DynamicFieldConfig, ExecuteTriggerResponse, ServiceTriggerConfig } from '../../interfaces/i-service-trigger.interface';

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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['configs']) {
      const next: Record<number, Record<string, any>> = {};
      for (const config of this.configs) {
        next[config.id] = this.defaultValues(config);
      }
      this.values.set(next);
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

  private defaultValues(config: ServiceTriggerConfig): Record<string, any> {
    if (config.triggerType === 'email_mockup') {
      return { to: '', cc: '', bcc: '', subject: '', body: '', previewMode: true };
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
    return {
      ...(config.payloadTemplate ?? {}),
      ...(this.values()[config.id] ?? {}),
      triggerLabel: config.label
    };
  }

  private validate(config: ServiceTriggerConfig): string | null {
    if (config.triggerType === 'email_mockup') {
      const value = this.values()[config.id] ?? {};
      if (!value['to'] || !value['subject']) return 'To and subject are required.';
      return null;
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
    const rules = field.validation;
    if (!rules) return null;
    if (rules.maxLength && String(value).length > rules.maxLength) return `${field.label} is too long.`;
    if (rules.regex && !new RegExp(rules.regex).test(String(value))) return `${field.label} is invalid.`;
    const numericValue = typeof value === 'number' ? value : (type === 'number' && value !== '' ? Number(value) : null);
    if (numericValue !== null && !Number.isNaN(numericValue)) {
      if (rules.min !== undefined && numericValue < rules.min) return `${field.label} is below the minimum.`;
      if (rules.max !== undefined && numericValue > rules.max) return `${field.label} is above the maximum.`;
    }
    return null;
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
