import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, distinctUntilChanged, forkJoin, map, of, throwError } from 'rxjs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { PortalSidebarComponent } from '../../../../components/portal-sidebar/portal-sidebar.component';
import { ServiceTriggerRendererComponent } from '../../../../components/service-trigger-renderer/service-trigger-renderer.component';
import { PendingChangesComponent } from '../../../../guards/pending-changes.guard';
import { DynamicFieldConfig, DynamicFieldFormatter, DynamicFieldOption, DynamicFieldType, ServiceTriggerConfig } from '../../../../interfaces/i-service-trigger.interface';
import { IDevPortalService } from '../../../../interfaces/i-service.interface';
import { DevService } from '../../../../services/dev.service';
import { ToastService } from '../../../../services/toast.service';

interface BuilderFieldOption extends DynamicFieldOption {
  id: string;
  value: string;
}

interface BuilderField extends Omit<DynamicFieldConfig, 'options' | 'defaultValue'> {
  id: string;
  defaultValueText: string;
  options: BuilderFieldOption[];
}

@Component({
  selector: 'ca-dev-service-form-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatCheckboxModule, PortalSidebarComponent, ServiceTriggerRendererComponent],
  templateUrl: './dev-service-form-builder.component.html',
  styleUrl: './dev-service-form-builder.component.scss'
})
export class DevServiceFormBuilderComponent implements OnInit, PendingChangesComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dev = inject(DevService);
  private readonly toast = inject(ToastService);

  readonly guide = signal<IDevPortalService | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly formId = signal<number | null>(null);
  readonly responseMode = signal<'inline' | 'toast' | 'modal' | 'download'>('inline');
  readonly payloadTemplateText = signal('{\n  "source": "custom-form"\n}');
  readonly validationError = signal<string | null>(null);
  readonly fields = signal<BuilderField[]>([]);

  formLabel = '';
  formDescription = '';
  private userServiceId: number | null = null;
  private lastSavedSnapshot = '';
  private fieldCounter = 0;
  private optionCounter = 0;

  readonly fieldTypeOptions: Array<{ value: DynamicFieldType; label: string }> = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Textarea' },
    { value: 'richText', label: 'Rich Text' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'time', label: 'Time' },
    { value: 'datetime', label: 'Date Time' },
    { value: 'dateRange', label: 'Date Range' },
    { value: 'select', label: 'Select' },
    { value: 'multi-select', label: 'Multi Select' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'toggle', label: 'Toggle' },
    { value: 'email', label: 'Email' },
    { value: 'hidden', label: 'Hidden' },
  ];

  readonly formatterOptions: Array<{ value: '' | DynamicFieldFormatter; label: string }> = [
    { value: '', label: 'None' },
    { value: 'decimal', label: 'Decimal' },
    { value: 'currency', label: 'Currency' },
    { value: 'phone', label: 'Phone' },
    { value: 'email', label: 'Email' },
  ];

  readonly previewConfigs = computed<ServiceTriggerConfig[]>(() => {
    const guide = this.guide();
    if (!guide || !this.formLabel.trim()) return [];

    const payload = this.tryParsePayloadTemplate();
    return [{
      id: this.formId() ?? 0,
      serviceId: guide.serviceId,
      userServiceId: guide.userServiceId,
      workflowId: undefined,
      triggerType: 'form',
      label: this.formLabel.trim(),
      description: this.formDescription.trim() || undefined,
      method: 'POST',
      payloadTemplate: payload ?? {},
      fields: this.fields().map(field => this.toFieldConfig(field)),
      responseMode: this.responseMode(),
    }];
  });

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(
        map(queryParams => this.parseUserServiceId(queryParams.get('userServiceId'))),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(userServiceId => {
        this.userServiceId = userServiceId;
        if (userServiceId === null) {
          this.handleLoadFailure();
          return;
        }

        this.load(userServiceId);
      });
  }

  hasPendingChanges(): boolean {
    return !this.loading() && this.snapshot() !== this.lastSavedSnapshot;
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.hasPendingChanges()) return;
    event.preventDefault();
    event.returnValue = '';
  }

  addField(type: DynamicFieldType = 'text'): void {
    const field = this.createField(type);
    this.fields.update(fields => [...fields, field]);
    this.touch();
  }

  removeField(fieldId: string): void {
    this.fields.update(fields => fields.filter(field => field.id !== fieldId));
    this.touch();
  }

  moveField(index: number, direction: -1 | 1): void {
    this.fields.update(fields => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= fields.length) return fields;
      const clone = [...fields];
      const [item] = clone.splice(index, 1);
      clone.splice(nextIndex, 0, item);
      return clone;
    });
    this.touch();
  }

  addOption(fieldId: string): void {
    this.updateField(fieldId, field => {
      field.options = [...field.options, this.createOption()];
    });
  }

  removeOption(fieldId: string, optionId: string): void {
    this.updateField(fieldId, field => {
      field.options = field.options.filter(option => option.id !== optionId);
    });
  }

  moveOption(fieldId: string, index: number, direction: -1 | 1): void {
    this.updateField(fieldId, field => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= field.options.length) return;
      const clone = [...field.options];
      const [item] = clone.splice(index, 1);
      clone.splice(nextIndex, 0, item);
      field.options = clone;
    });
  }

  onFieldTypeChange(fieldId: string, type: string): void {
    this.updateField(fieldId, field => {
      field.type = type as DynamicFieldType;
      if (type === 'hidden') field.hidden = true;
      if (type !== 'select' && type !== 'multi-select' && type !== 'multiSelect') field.options = [];
      if (type === 'dateRange') {
        field.validation = { ...(field.validation ?? {}), preventEndBeforeStart: true };
      }
    });
  }

  setFieldKey(fieldId: string, value: string): void {
    this.updateField(fieldId, field => {
      field.key = value;
    });
  }

  setFieldName(fieldId: string, value: string): void {
    this.updateField(fieldId, field => {
      field.name = value;
    });
  }

  setFieldLabel(fieldId: string, value: string): void {
    this.updateField(fieldId, field => {
      field.label = value;
    });
  }

  setFieldPlaceholder(fieldId: string, value: string): void {
    this.updateField(fieldId, field => {
      field.placeholder = value;
    });
  }

  setFieldDefaultValue(fieldId: string, value: string): void {
    this.updateField(fieldId, field => {
      field.defaultValueText = value;
    });
  }

  setFieldFormatter(fieldId: string, value: string): void {
    this.updateField(fieldId, field => {
      field.formatter = (value || undefined) as DynamicFieldFormatter | undefined;
    });
  }

  setFieldMin(fieldId: string, value: string): void {
    this.updateField(fieldId, field => {
      field.validation = { ...(field.validation ?? {}), min: value === '' ? undefined : Number(value) };
    });
  }

  setFieldMax(fieldId: string, value: string): void {
    this.updateField(fieldId, field => {
      field.validation = { ...(field.validation ?? {}), max: value === '' ? undefined : Number(value) };
    });
  }

  setFieldRegex(fieldId: string, value: string): void {
    this.updateField(fieldId, field => {
      field.validation = { ...(field.validation ?? {}), regex: value };
    });
  }

  setFieldMaxLength(fieldId: string, value: string): void {
    this.updateField(fieldId, field => {
      field.validation = { ...(field.validation ?? {}), maxLength: value === '' ? undefined : Number(value) };
    });
  }

  setFieldRequired(fieldId: string, checked: boolean): void {
    this.updateField(fieldId, field => {
      field.required = checked;
    });
  }

  setFieldHidden(fieldId: string, checked: boolean): void {
    this.updateField(fieldId, field => {
      field.hidden = checked;
    });
  }

  setOptionLabel(fieldId: string, optionId: string, value: string): void {
    this.updateField(fieldId, field => {
      field.options = field.options.map(option => option.id === optionId ? { ...option, label: value } : option);
    });
  }

  setOptionValue(fieldId: string, optionId: string, value: string): void {
    this.updateField(fieldId, field => {
      field.options = field.options.map(option => option.id === optionId ? { ...option, value } : option);
    });
  }

  save(): void {
    const userServiceId = this.userServiceId;
    if (userServiceId === null) return;

    const error = this.validate();
    if (error) {
      this.validationError.set(error);
      this.toast.error(error);
      return;
    }

    const payloadTemplate = this.tryParsePayloadTemplate();
    if (payloadTemplate === null) {
      const message = 'Payload template must be valid JSON.';
      this.validationError.set(message);
      this.toast.error(message);
      return;
    }

    this.validationError.set(null);
    this.saving.set(true);

    const payload = {
      label: this.formLabel.trim(),
      description: this.formDescription.trim() || undefined,
      fields: this.fields().map(field => this.toFieldPayload(field)),
      payloadTemplate,
      responseMode: this.responseMode(),
    };

    const creating = this.formId() === null;
    const request = creating
      ? this.dev.createForm(userServiceId, payload)
      : this.dev.updateForm(userServiceId, payload);

    request.subscribe({
      next: config => {
        this.hydrateForm(config, false);
        this.saving.set(false);
        this.toast.success(creating ? 'Custom form created.' : 'Custom form updated.');
      },
      error: err => {
        this.saving.set(false);
        this.toast.error(err?.error?.error ?? 'Custom form could not be saved.');
      }
    });
  }

  deleteForm(): void {
    const userServiceId = this.userServiceId;
    if (userServiceId === null || this.formId() === null || !window.confirm('Delete this custom form?')) return;

    this.deleting.set(true);
    this.dev.deleteForm(userServiceId).subscribe({
      next: () => {
        this.resetEmptyState();
        this.deleting.set(false);
        this.toast.success('Custom form deleted.');
      },
      error: err => {
        this.deleting.set(false);
        this.toast.error(err?.error?.error ?? 'Custom form could not be deleted.');
      }
    });
  }

  goBackToGuide(): void {
    if (this.userServiceId === null) return;
    void this.router.navigateByUrl(`/dev/dev-services/guide/?userServiceId=${this.userServiceId}`);
  }

  isChoiceField(field: BuilderField): boolean {
    return field.type === 'select' || field.type === 'multi-select' || field.type === 'multiSelect';
  }

  private load(userServiceId: number): void {
    this.loading.set(true);
    forkJoin({
      guide: this.dev.getGuide(userServiceId),
      form: this.dev.getForm(userServiceId).pipe(
        catchError(err => err?.status === 404 ? of(null) : throwError(() => err))
      )
    }).subscribe({
      next: ({ guide, form }) => {
        this.guide.set(guide);
        if (form) this.hydrateForm(form, true);
        else this.resetEmptyState(guide.serviceName);
        this.loading.set(false);
      },
      error: () => this.handleLoadFailure(),
    });
  }

  private hydrateForm(config: ServiceTriggerConfig, preserveLoadingState: boolean): void {
    this.formId.set(config.id);
    this.formLabel = config.label;
    this.formDescription = config.description ?? '';
    this.responseMode.set((config.responseMode ?? 'inline') as 'inline' | 'toast' | 'modal' | 'download');
    this.payloadTemplateText.set(JSON.stringify(config.payloadTemplate ?? { source: 'custom-form' }, null, 2));
    this.fields.set((config.fields ?? []).map(field => this.fromFieldConfig(field)));
    this.lastSavedSnapshot = this.snapshot();
    this.validationError.set(null);
    if (!preserveLoadingState) this.loading.set(false);
  }

  private resetEmptyState(serviceName = this.guide()?.serviceName ?? 'Service'): void {
    this.formId.set(null);
    this.formLabel = `${serviceName} Form`;
    this.formDescription = '';
    this.responseMode.set('inline');
    this.payloadTemplateText.set('{\n  "source": "custom-form"\n}');
    this.fields.set([]);
    this.lastSavedSnapshot = this.snapshot();
    this.validationError.set(null);
  }

  private validate(): string | null {
    if (!this.formLabel.trim()) return 'Form label is required.';

    const keys = new Set<string>();
    for (const field of this.fields()) {
      const key = field.key.trim();
      const label = field.label.trim();
      const isVisible = !field.hidden && field.type !== 'hidden';

      if (!key) return 'Each field requires a key.';
      if (keys.has(key.toLowerCase())) return `Field key "${key}" must be unique.`;
      keys.add(key.toLowerCase());

      if (isVisible && !label) return `Field "${key}" requires a label.`;

      if ((field.hidden || field.type === 'hidden') && !field.defaultValueText.trim()) {
        return `Hidden field "${key}" requires a default value.`;
      }

      if (field.required && this.isChoiceField(field) && field.options.length === 0) {
        return `Field "${key}" requires at least one option.`;
      }

      if (field.type === 'dateRange' && field.validation?.preventEndBeforeStart === false) {
        return `Field "${key}" must prevent end dates earlier than start dates.`;
      }
    }

    return null;
  }

  private handleLoadFailure(): void {
    this.guide.set(null);
    this.loading.set(false);
    this.toast.error('Unable to load the selected service form builder.');
    void this.router.navigate(['/dev/dev-services'], { replaceUrl: true });
  }

  private createField(type: DynamicFieldType): BuilderField {
    this.fieldCounter += 1;
    return {
      id: `field-${this.fieldCounter}`,
      key: '',
      name: '',
      label: '',
      type,
      required: false,
      hidden: type === 'hidden',
      defaultValueText: '',
      placeholder: '',
      formatter: undefined,
      options: [],
      validation: type === 'dateRange' ? { preventEndBeforeStart: true } : {},
    };
  }

  private createOption(): BuilderFieldOption {
    this.optionCounter += 1;
    return {
      id: `option-${this.optionCounter}`,
      label: '',
      value: '',
    };
  }

  private fromFieldConfig(field: DynamicFieldConfig): BuilderField {
    const builderField = this.createField(field.type);
    builderField.key = field.key;
    builderField.name = field.name ?? '';
    builderField.label = field.label ?? '';
    builderField.required = field.required ?? false;
    builderField.hidden = field.hidden ?? field.type === 'hidden';
    builderField.defaultValueText = field.defaultValue === undefined ? '' : this.stringifyValue(field.defaultValue);
    builderField.placeholder = field.placeholder ?? '';
    builderField.formatter = field.formatter;
    builderField.options = (field.options ?? []).map(option => ({
      id: this.createOption().id,
      label: option.label,
      value: this.stringifyValue(option.value),
    }));
    builderField.validation = {
      min: field.validation?.min,
      max: field.validation?.max,
      regex: field.validation?.regex,
      maxLength: field.validation?.maxLength,
      preventEndBeforeStart: field.type === 'dateRange' ? field.validation?.preventEndBeforeStart ?? true : field.validation?.preventEndBeforeStart,
    };
    return builderField;
  }

  private toFieldConfig(field: BuilderField): DynamicFieldConfig {
    return {
      key: field.key.trim(),
      name: (field.name ?? '').trim() || undefined,
      label: field.label.trim() || field.key.trim(),
      type: field.type,
      required: field.required,
      hidden: field.hidden || field.type === 'hidden',
      defaultValue: this.parseMaybeJson(field.defaultValueText),
      placeholder: (field.placeholder ?? '').trim() || undefined,
      formatter: field.formatter || undefined,
      options: field.options.map(option => ({ label: option.label.trim(), value: this.parseMaybeJson(option.value) })),
      validation: {
        min: field.validation?.min,
        max: field.validation?.max,
        regex: field.validation?.regex?.trim() || undefined,
        maxLength: field.validation?.maxLength,
        preventEndBeforeStart: field.type === 'dateRange' ? true : field.validation?.preventEndBeforeStart,
      },
    };
  }

  private toFieldPayload(field: BuilderField): Record<string, unknown> {
    const config = this.toFieldConfig(field);
    return {
      key: config.key,
      name: config.name,
      label: config.label,
      type: config.type,
      required: config.required,
      hidden: config.hidden,
      defaultValue: config.defaultValue,
      placeholder: config.placeholder,
      formatter: config.formatter,
      options: (config.options ?? []).map(option => ({ label: option.label, value: option.value })),
      validation: config.validation,
    };
  }

  private tryParsePayloadTemplate(): Record<string, unknown> | null {
    try {
      const parsed = JSON.parse(this.payloadTemplateText());
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return null;
    }
  }

  private parseMaybeJson(value: string): unknown {
    const trimmed = value.trim();
    if (!trimmed) return '';
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  private stringifyValue(value: unknown): string {
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  }

  private parseUserServiceId(value: string | null): number | null {
    if (!value?.trim() || !/^\d+$/.test(value)) return null;
    const userServiceId = Number(value);
    return Number.isSafeInteger(userServiceId) && userServiceId > 0 ? userServiceId : null;
  }

  updateField(fieldId: string, updater: (field: BuilderField) => void): void {
    this.fields.update(fields => fields.map(field => {
      if (field.id !== fieldId) return field;
      const clone: BuilderField = {
        ...field,
        options: [...field.options],
        validation: { ...(field.validation ?? {}) },
      };
      updater(clone);
      return clone;
    }));
    this.touch();
  }

  touch(): void {
    this.validationError.set(null);
  }

  private snapshot(): string {
    return JSON.stringify({
      formId: this.formId(),
      label: this.formLabel.trim(),
      description: this.formDescription.trim(),
      responseMode: this.responseMode(),
      payloadTemplateText: this.payloadTemplateText(),
      fields: this.fields(),
    });
  }
}
