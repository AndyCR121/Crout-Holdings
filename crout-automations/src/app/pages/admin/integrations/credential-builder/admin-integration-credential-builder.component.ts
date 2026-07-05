import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminSidebarComponent } from '../../../../components/admin-sidebar/admin-sidebar.component';
import { DynamicFieldConfig, DynamicFieldOption, DynamicFieldType } from '../../../../interfaces/i-service-trigger.interface';
import { AuthService } from '../../../../services/auth.service';
import { AdminIntegrationDraftService } from '../../../../services/admin-integration-draft.service';

type SupportedCredentialFieldType =
  | 'text'
  | 'password'
  | 'textarea'
  | 'email'
  | 'url'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'hidden';

@Component({
  selector: 'ca-admin-integration-credential-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent],
  templateUrl: './admin-integration-credential-builder.component.html',
  styleUrls: ['./admin-integration-credential-builder.component.scss'],
})
export class AdminIntegrationCredentialBuilderComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly draftStore = inject(AdminIntegrationDraftService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly fields = signal<DynamicFieldConfig[]>([]);
  readonly selectedIndex = signal<number>(-1);
  readonly integrationLabel = signal('Integration');

  readonly supportedTypes: SupportedCredentialFieldType[] = [
    'text',
    'password',
    'textarea',
    'email',
    'url',
    'number',
    'select',
    'checkbox',
    'hidden',
  ];

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user?.isAdmin) {
      void this.router.navigate(['/client/dashboard']);
      return;
    }

    const draftState = this.draftStore.getDraft();
    if (!draftState) {
      void this.router.navigate(['/admin/integrations']);
      return;
    }

    this.integrationLabel.set(draftState.draft.name?.trim() || 'Integration');
    this.fields.set(structuredClone(draftState.draft.credentialFormSchema?.fields ?? []));
    this.selectedIndex.set(this.fields().length > 0 ? 0 : -1);
    this.loading.set(false);
  }

  selectedField(): DynamicFieldConfig | null {
    const index = this.selectedIndex();
    const fields = this.fields();
    return index >= 0 && index < fields.length ? fields[index] : null;
  }

  addField(type: SupportedCredentialFieldType): void {
    const fields = [...this.fields(), this.createField(type)];
    this.fields.set(fields);
    this.selectedIndex.set(fields.length - 1);
    this.error.set(null);
  }

  selectField(index: number): void {
    this.selectedIndex.set(index);
  }

  moveField(index: number, direction: -1 | 1): void {
    const nextIndex = index + direction;
    const fields = [...this.fields()];
    if (nextIndex < 0 || nextIndex >= fields.length) return;

    const [field] = fields.splice(index, 1);
    fields.splice(nextIndex, 0, field);
    this.fields.set(fields);
    this.selectedIndex.set(nextIndex);
  }

  removeField(index: number): void {
    const fields = [...this.fields()];
    fields.splice(index, 1);
    this.fields.set(fields);
    this.selectedIndex.set(fields.length === 0 ? -1 : Math.min(index, fields.length - 1));
  }

  updateField<K extends keyof DynamicFieldConfig>(key: K, value: DynamicFieldConfig[K]): void {
    const index = this.selectedIndex();
    if (index < 0) return;

    const fields = [...this.fields()];
    fields[index] = { ...fields[index], [key]: value };
    this.fields.set(fields);
  }

  updateFieldType(value: SupportedCredentialFieldType): void {
    const current = this.selectedField();
    if (!current) return;

    const replacement = this.createField(value);
    replacement.key = current.key;
    replacement.name = current.name;
    replacement.label = current.label;
    replacement.required = current.required;
    replacement.hidden = current.hidden;
    replacement.placeholder = current.placeholder;
    replacement.defaultValue = current.defaultValue;
    this.replaceSelectedField(replacement);
  }

  addOption(): void {
    const field = this.selectedField();
    if (!field || !this.supportsOptions(field.type)) return;
    const options = [...(field.options ?? []), { label: '', value: '' }];
    this.updateField('options', options);
  }

  updateOption(index: number, key: keyof DynamicFieldOption, value: string): void {
    const field = this.selectedField();
    if (!field || !this.supportsOptions(field.type)) return;
    const options = [...(field.options ?? [])];
    options[index] = { ...options[index], [key]: value };
    this.updateField('options', options);
  }

  removeOption(index: number): void {
    const field = this.selectedField();
    if (!field || !this.supportsOptions(field.type)) return;
    const options = [...(field.options ?? [])];
    options.splice(index, 1);
    this.updateField('options', options);
  }

  saveAndReturn(): void {
    const validationError = this.validate();
    if (validationError) {
      this.error.set(validationError);
      return;
    }

    const draftState = this.draftStore.getDraft();
    if (!draftState) {
      void this.router.navigate(['/admin/integrations']);
      return;
    }

    draftState.draft = {
      ...draftState.draft,
      credentialFormSchema: this.fields().length ? { fields: structuredClone(this.fields()) } : null,
    };
    this.draftStore.saveDraft(draftState);
    void this.router.navigate(['/admin/integrations'], { queryParams: { resumeDraft: 1 } });
  }

  cancel(): void {
    void this.router.navigate(['/admin/integrations'], { queryParams: { resumeDraft: 1 } });
  }

  supportsOptions(type: DynamicFieldType): boolean {
    return type === 'select' || type === 'checkbox';
  }

  trackByIndex(index: number): number {
    return index;
  }

  private validate(): string | null {
    const seenKeys = new Set<string>();
    for (const field of this.fields()) {
      const key = field.key?.trim();
      if (!key) return 'Each credential field requires a key.';
      if (seenKeys.has(key.toLowerCase())) return `Credential field key "${key}" must be unique.`;
      seenKeys.add(key.toLowerCase());

      if (!field.label?.trim()) return `Credential field "${key}" requires a label.`;

      if (this.supportsOptions(field.type) && (field.options?.some(option => !option.label?.toString().trim()) ?? false)) {
        return `All options for "${key}" need a label.`;
      }
    }

    return null;
  }

  private replaceSelectedField(field: DynamicFieldConfig): void {
    const index = this.selectedIndex();
    if (index < 0) return;

    const fields = [...this.fields()];
    fields[index] = field;
    this.fields.set(fields);
  }

  private createField(type: SupportedCredentialFieldType): DynamicFieldConfig {
    const base: DynamicFieldConfig = {
      key: '',
      label: '',
      type,
      required: false,
      hidden: type === 'hidden',
      placeholder: '',
      defaultValue: '',
    };

    if (type === 'select' || type === 'checkbox') {
      base.options = [{ label: '', value: '' }];
    }

    return base;
  }
}
