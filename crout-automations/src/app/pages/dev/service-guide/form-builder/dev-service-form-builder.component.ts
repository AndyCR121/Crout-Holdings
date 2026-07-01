import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, distinctUntilChanged, forkJoin, map, of, throwError } from 'rxjs';
import { PortalSidebarComponent } from '../../../../components/portal-sidebar/portal-sidebar.component';
import {
  CustomFormCheckboxElement,
  CustomFormDateTimeElement,
  CustomFormDividerElement,
  CustomFormElement,
  CustomFormFieldFamily,
  CustomFormHeaderElement,
  CustomFormInputElement,
  CustomFormListElement,
  CustomFormListItemCheckboxField,
  CustomFormListItemDateTimeField,
  CustomFormListItemField,
  CustomFormListItemInputField,
  CustomFormListItemSelectField,
  CustomFormOption,
  CustomFormParagraphElement,
  CustomFormResponseMode,
  CustomFormSelectElement,
  CustomFormTab,
  CustomFormTabsElement,
  DevUserServiceForm
} from '../../../../interfaces/i-custom-form-builder.interface';
import { DynamicFieldConfig, DynamicFieldOption } from '../../../../interfaces/i-service-trigger.interface';
import { IDevPortalService } from '../../../../interfaces/i-service.interface';
import { PendingChangesComponent } from '../../../../guards/pending-changes.guard';
import { DevService } from '../../../../services/dev.service';
import { ToastService } from '../../../../services/toast.service';

type SelectedTarget = 'form' | string;

@Component({
  selector: 'ca-dev-service-form-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatCheckboxModule, PortalSidebarComponent],
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
  readonly validationError = signal<string | null>(null);
  readonly elements = signal<CustomFormElement[]>([]);
  readonly selectedTarget = signal<SelectedTarget>('form');

  formLabel = '';
  formDescription = '';
  responseMode: CustomFormResponseMode = 'inline';
  productionWebhookUrl = '';
  payloadTemplateText = '{\n  "source": "custom-form"\n}';

  private userServiceId: number | null = null;
  private lastSavedSnapshot = '';
  private elementCounter = 0;
  private optionCounter = 0;
  private tabCounter = 0;
  private listFieldCounter = 0;

  readonly selectedElement = computed(() => {
    const target = this.selectedTarget();
    return target === 'form' ? null : this.elements().find(element => element.id === target) ?? null;
  });

  readonly tabsElement = computed(() =>
    this.elements().find((element): element is CustomFormTabsElement => element.type === 'tabs') ?? null
  );

  readonly availableTabs = computed(() => this.tabsElement()?.tabs ?? []);

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(
        map(queryParams => this.parseUserServiceId(queryParams.get('userServiceId'))),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
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

  selectCanvasElement(target: SelectedTarget): void {
    this.selectedTarget.set(target);
  }

  isSelected(target: SelectedTarget): boolean {
    return this.selectedTarget() === target;
  }

  propertiesTitle(): string {
    const element = this.selectedElement();
    return element ? this.elementTypeLabel(element.type) : 'Form Settings';
  }

  addElement(type: CustomFormElement['type']): void {
    const element = this.createElement(type);
    this.elements.update(items => [...items, element]);
    this.selectedTarget.set(element.id);
    this.touch();
  }

  removeElement(elementId: string): void {
    const existing = this.elements().find(element => element.id === elementId);
    if (!existing) return;

    if (existing.type === 'tabs') {
      this.elements.update(items => items.map(item => item.id === existing.id ? item : { ...item, tabId: null }));
    }

    this.elements.update(items => items.filter(element => element.id !== elementId));
    this.selectedTarget.set('form');
    this.touch();
  }

  moveElement(index: number, direction: -1 | 1): void {
    this.elements.update(items => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= items.length) return items;

      const clone = [...items];
      const [item] = clone.splice(index, 1);
      clone.splice(nextIndex, 0, item);
      return clone;
    });
    this.touch();
  }

  addOption(elementId: string): void {
    this.updateElement(elementId, element => {
      if (element.type !== 'select' && element.type !== 'checkbox') return;
      element.options = [...element.options, this.createOption()];
    });
  }

  removeOption(elementId: string, optionId: string): void {
    this.updateElement(elementId, element => {
      if (element.type !== 'select' && element.type !== 'checkbox') return;
      element.options = element.options.filter(option => option.id !== optionId);
    });
  }

  setOptionLabel(elementId: string, optionId: string, value: string): void {
    this.updateElement(elementId, element => {
      if (element.type !== 'select' && element.type !== 'checkbox') return;
      element.options = element.options.map(option => option.id === optionId ? { ...option, label: value } : option);
    });
  }

  setOptionValue(elementId: string, optionId: string, value: string): void {
    this.updateElement(elementId, element => {
      if (element.type !== 'select' && element.type !== 'checkbox') return;
      element.options = element.options.map(option => option.id === optionId ? { ...option, value } : option);
    });
  }

  addTab(elementId: string): void {
    this.updateElement(elementId, element => {
      if (element.type !== 'tabs') return;
      const tab = this.createTab();
      element.tabs = [...element.tabs, tab];
      element.activeTabId = element.activeTabId || tab.id;
    });
  }

  removeTab(elementId: string, tabId: string): void {
    this.updateElement(elementId, element => {
      if (element.type !== 'tabs' || element.tabs.length === 1) return;
      element.tabs = element.tabs.filter(tab => tab.id !== tabId);
      if (element.activeTabId === tabId) element.activeTabId = element.tabs[0]?.id ?? null;
    });

    this.elements.update(items => items.map(item => item.tabId === tabId ? { ...item, tabId: null } : item));
    this.touch();
  }

  setTabLabel(elementId: string, tabId: string, value: string): void {
    this.updateElement(elementId, element => {
      if (element.type !== 'tabs') return;
      element.tabs = element.tabs.map(tab => tab.id === tabId ? { ...tab, label: value } : tab);
    });
  }

  setActiveTab(elementId: string, tabId: string): void {
    this.updateElement(elementId, element => {
      if (element.type !== 'tabs') return;
      element.activeTabId = tabId;
    });
  }

  setTabAssignment(elementId: string, tabId: string | null): void {
    this.updateElement(elementId, element => {
      if (element.type === 'tabs') return;
      element.tabId = tabId;
    });
  }

  addListField(listElementId: string, type: CustomFormFieldFamily): void {
    this.updateElement(listElementId, element => {
      if (element.type !== 'list') return;
      element.fields = [...element.fields, this.createListField(type)];
    });
  }

  moveListField(listElementId: string, fieldIndex: number, direction: -1 | 1): void {
    this.updateElement(listElementId, element => {
      if (element.type !== 'list') return;
      const nextIndex = fieldIndex + direction;
      if (nextIndex < 0 || nextIndex >= element.fields.length) return;
      const clone = [...element.fields];
      const [field] = clone.splice(fieldIndex, 1);
      clone.splice(nextIndex, 0, field);
      element.fields = clone;
    });
  }

  removeListField(listElementId: string, fieldId: string): void {
    this.updateElement(listElementId, element => {
      if (element.type !== 'list') return;
      element.fields = element.fields.filter(field => field.id !== fieldId);
    });
  }

  updateListFieldText(listElementId: string, fieldId: string, fieldName: string, value: string): void {
    this.updateListField(listElementId, fieldId, field => {
      Object.assign(field, { [fieldName]: value });
    });
  }

  updateListInputFieldMode(listElementId: string, fieldId: string, value: CustomFormListItemInputField['inputMode']): void {
    this.updateListField(listElementId, fieldId, field => {
      if (field.type !== 'input') return;
      field.inputMode = value;
      if (value === 'hidden') field.hidden = true;
    });
  }

  updateListInputFieldFormatter(listElementId: string, fieldId: string, value: CustomFormListItemInputField['formatter']): void {
    this.updateListField(listElementId, fieldId, field => {
      if (field.type !== 'input') return;
      field.formatter = value;
    });
  }

  updateListInputFieldMaxLength(listElementId: string, fieldId: string, value: string): void {
    const maxLength = value.trim() === '' ? null : Number(value);
    this.updateListField(listElementId, fieldId, field => {
      if (field.type !== 'input') return;
      field.validation = {
        ...(field.validation ?? {}),
        maxLength: Number.isFinite(maxLength as number) ? maxLength : null
      };
    });
  }

  updateListInputFieldRegex(listElementId: string, fieldId: string, value: string): void {
    this.updateListField(listElementId, fieldId, field => {
      if (field.type !== 'input') return;
      field.validation = { ...(field.validation ?? {}), regex: value };
    });
  }

  updateListFieldRequired(listElementId: string, fieldId: string, change: MatCheckboxChange): void {
    this.updateListField(listElementId, fieldId, field => {
      Object.assign(field, { required: change.checked });
    });
  }

  updateListFieldHidden(listElementId: string, fieldId: string, change: MatCheckboxChange): void {
    this.updateListField(listElementId, fieldId, field => {
      if (field.type !== 'input' && field.type !== 'checkbox') return;
      field.hidden = change.checked;
    });
  }

  updateListSelectFieldMode(listElementId: string, fieldId: string, value: CustomFormListItemSelectField['selectMode']): void {
    this.updateListField(listElementId, fieldId, field => {
      if (field.type !== 'select') return;
      field.selectMode = value;
    });
  }

  updateListSelectFieldSearchable(listElementId: string, fieldId: string, change: MatCheckboxChange): void {
    this.updateListField(listElementId, fieldId, field => {
      if (field.type !== 'select') return;
      field.searchable = change.checked;
    });
  }

  updateListDateTimeFieldMode(listElementId: string, fieldId: string, value: CustomFormListItemDateTimeField['dateTimeMode']): void {
    this.updateListField(listElementId, fieldId, field => {
      if (field.type !== 'datetime') return;
      field.dateTimeMode = value;
    });
  }

  updateListCheckboxFieldMode(listElementId: string, fieldId: string, value: CustomFormListItemCheckboxField['checkboxMode']): void {
    this.updateListField(listElementId, fieldId, field => {
      if (field.type !== 'checkbox') return;
      field.checkboxMode = value;
    });
  }

  addListFieldOption(listElementId: string, fieldId: string): void {
    this.updateListField(listElementId, fieldId, field => {
      if (field.type !== 'select' && field.type !== 'checkbox') return;
      field.options = [...field.options, this.createOption()];
    });
  }

  removeListFieldOption(listElementId: string, fieldId: string, optionId: string): void {
    this.updateListField(listElementId, fieldId, field => {
      if (field.type !== 'select' && field.type !== 'checkbox') return;
      field.options = field.options.filter(option => option.id !== optionId);
    });
  }

  setListFieldOptionLabel(listElementId: string, fieldId: string, optionId: string, value: string): void {
    this.updateListField(listElementId, fieldId, field => {
      if (field.type !== 'select' && field.type !== 'checkbox') return;
      field.options = field.options.map(option => option.id === optionId ? { ...option, label: value } : option);
    });
  }

  setListFieldOptionValue(listElementId: string, fieldId: string, optionId: string, value: string): void {
    this.updateListField(listElementId, fieldId, field => {
      if (field.type !== 'select' && field.type !== 'checkbox') return;
      field.options = field.options.map(option => option.id === optionId ? { ...option, value } : option);
    });
  }

  updateFormLabel(value: string): void {
    this.formLabel = value;
    this.touch();
  }

  updateFormDescription(value: string): void {
    this.formDescription = value;
    this.touch();
  }

  updateResponseMode(value: CustomFormResponseMode): void {
    this.responseMode = value;
    this.touch();
  }

  updatePayloadTemplateText(value: string): void {
    this.payloadTemplateText = value;
    this.touch();
  }

  updateSelectedInputMode(value: CustomFormInputElement['inputMode']): void {
    this.updateSelectedInput({ inputMode: value, hidden: value === 'hidden' ? true : undefined });
  }

  updateSelectedInputText(field: 'key' | 'name' | 'label' | 'placeholder' | 'defaultValueText', value: string): void {
    this.updateSelectedInput({ [field]: value } as Partial<CustomFormInputElement>);
  }

  updateSelectedInputFormatter(value: CustomFormInputElement['formatter']): void {
    this.updateSelectedInput({ formatter: value });
  }

  updateSelectedInputMaxLength(value: string): void {
    const maxLength = value.trim() === '' ? null : Number(value);
    this.updateSelectedInputValidation({ maxLength: Number.isFinite(maxLength as number) ? maxLength : null });
  }

  updateSelectedInputRegex(value: string): void {
    this.updateSelectedInputValidation({ regex: value });
  }

  updateSelectedInputRequired(change: MatCheckboxChange): void {
    this.updateSelectedInput({ required: change.checked });
  }

  updateSelectedInputHidden(change: MatCheckboxChange): void {
    this.updateSelectedInput({ hidden: change.checked });
  }

  updateSelectedInputTab(value: string): void {
    const element = this.selectedInputElement();
    if (!element) return;
    this.setTabAssignment(element.id, value || null);
  }

  updateSelectedSelectMode(value: CustomFormSelectElement['selectMode']): void {
    this.updateSelectedSelect({ selectMode: value });
  }

  updateSelectedSelectText(field: 'key' | 'name' | 'label' | 'placeholder', value: string): void {
    this.updateSelectedSelect({ [field]: value } as Partial<CustomFormSelectElement>);
  }

  updateSelectedSelectRequired(change: MatCheckboxChange): void {
    this.updateSelectedSelect({ required: change.checked });
  }

  updateSelectedSelectSearchable(change: MatCheckboxChange): void {
    this.updateSelectedSelect({ searchable: change.checked });
  }

  updateSelectedSelectTab(value: string): void {
    const element = this.selectedSelectElement();
    if (!element) return;
    this.setTabAssignment(element.id, value || null);
  }

  updateSelectedDateTimeMode(value: CustomFormDateTimeElement['dateTimeMode']): void {
    this.updateSelectedDateTime({ dateTimeMode: value });
  }

  updateSelectedDateTimeText(
    field: 'key' | 'name' | 'label' | 'minValue' | 'maxValue' | 'relativeMin' | 'relativeMax',
    value: string
  ): void {
    this.updateSelectedDateTime({ [field]: value } as Partial<CustomFormDateTimeElement>);
  }

  updateSelectedDateTimeRequired(change: MatCheckboxChange): void {
    this.updateSelectedDateTime({ required: change.checked });
  }

  updateSelectedDateTimeTab(value: string): void {
    const element = this.selectedDateTimeElement();
    if (!element) return;
    this.setTabAssignment(element.id, value || null);
  }

  updateSelectedCheckboxMode(value: CustomFormCheckboxElement['checkboxMode']): void {
    this.updateSelectedCheckbox({ checkboxMode: value });
  }

  updateSelectedCheckboxText(field: 'key' | 'name' | 'label' | 'parentKey', value: string): void {
    this.updateSelectedCheckbox({ [field]: value } as Partial<CustomFormCheckboxElement>);
  }

  updateSelectedCheckboxRequired(change: MatCheckboxChange): void {
    this.updateSelectedCheckbox({ required: change.checked });
  }

  updateSelectedCheckboxHidden(change: MatCheckboxChange): void {
    this.updateSelectedCheckbox({ hidden: change.checked });
  }

  updateSelectedCheckboxTab(value: string): void {
    const element = this.selectedCheckboxElement();
    if (!element) return;
    this.setTabAssignment(element.id, value || null);
  }

  updateSelectedListText(
    field: 'key' | 'name' | 'label' | 'addButtonLabel' | 'emptyStateText' | 'itemLabel',
    value: string
  ): void {
    this.updateSelectedList({ [field]: value } as Partial<CustomFormListElement>);
  }

  updateSelectedListMinItems(value: string): void {
    const minItems = value.trim() === '' ? null : Number(value);
    this.updateSelectedList({ minItems: Number.isFinite(minItems as number) ? minItems : null });
  }

  updateSelectedListMaxItems(value: string): void {
    const maxItems = value.trim() === '' ? null : Number(value);
    this.updateSelectedList({ maxItems: Number.isFinite(maxItems as number) ? maxItems : null });
  }

  updateSelectedListTab(value: string): void {
    const element = this.selectedListElement();
    if (!element) return;
    this.setTabAssignment(element.id, value || null);
  }

  updateSelectedHeaderLevel(value: CustomFormHeaderElement['level']): void {
    this.updateSelectedHeader({ level: value });
  }

  updateSelectedHeaderText(value: string): void {
    this.updateSelectedHeader({ text: value });
  }

  updateSelectedHeaderTab(value: string): void {
    const element = this.selectedHeaderElement();
    if (!element) return;
    this.setTabAssignment(element.id, value || null);
  }

  updateSelectedParagraphText(value: string): void {
    this.updateSelectedParagraph({ text: value });
  }

  updateSelectedParagraphTab(value: string): void {
    const element = this.selectedParagraphElement();
    if (!element) return;
    this.setTabAssignment(element.id, value || null);
  }

  updateSelectedDividerStyle(value: CustomFormDividerElement['dividerStyle']): void {
    this.updateSelectedDivider({ dividerStyle: value });
  }

  updateSelectedDividerTab(value: string): void {
    const element = this.selectedDividerElement();
    if (!element) return;
    this.setTabAssignment(element.id, value || null);
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

    const payload = {
      label: this.formLabel.trim(),
      description: this.formDescription.trim() || undefined,
      responseMode: this.responseMode,
      productionWebhookUrl: this.productionWebhookUrl.trim(),
      payloadTemplate,
      schema: {
        elements: this.elements().map(element => structuredClone(element))
      }
    };

    const creating = this.formId() === null;
    this.validationError.set(null);
    this.saving.set(true);

    const request = creating
      ? this.dev.createForm(userServiceId, payload)
      : this.dev.updateForm(userServiceId, payload);

    request.subscribe({
      next: form => {
        this.hydrateForm(form);
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

  selectedInputElement(): CustomFormInputElement | null {
    const element = this.selectedElement();
    return element?.type === 'input' ? element : null;
  }

  selectedSelectElement(): CustomFormSelectElement | null {
    const element = this.selectedElement();
    return element?.type === 'select' ? element : null;
  }

  selectedDateTimeElement(): CustomFormDateTimeElement | null {
    const element = this.selectedElement();
    return element?.type === 'datetime' ? element : null;
  }

  selectedCheckboxElement(): CustomFormCheckboxElement | null {
    const element = this.selectedElement();
    return element?.type === 'checkbox' ? element : null;
  }

  selectedListElement(): CustomFormListElement | null {
    const element = this.selectedElement();
    return element?.type === 'list' ? element : null;
  }

  selectedHeaderElement(): CustomFormHeaderElement | null {
    const element = this.selectedElement();
    return element?.type === 'header' ? element : null;
  }

  selectedParagraphElement(): CustomFormParagraphElement | null {
    const element = this.selectedElement();
    return element?.type === 'paragraph' ? element : null;
  }

  selectedDividerElement(): CustomFormDividerElement | null {
    const element = this.selectedElement();
    return element?.type === 'divider' ? element : null;
  }

  selectedTabsElement(): CustomFormTabsElement | null {
    const element = this.selectedElement();
    return element?.type === 'tabs' ? element : null;
  }

  elementTitle(element: CustomFormElement, index: number): string {
    switch (element.type) {
      case 'input':
      case 'select':
      case 'datetime':
      case 'checkbox':
      case 'list':
        return element.label || element.key || `${this.elementTypeLabel(element.type)} ${index + 1}`;
      case 'header':
        return element.text || `Header ${index + 1}`;
      case 'paragraph':
        return element.text || `Paragraph ${index + 1}`;
      case 'divider':
        return `Divider ${index + 1}`;
      case 'tabs':
        return `Tabs (${element.tabs.length})`;
    }
  }

  elementTypeLabel(type: CustomFormElement['type'] | CustomFormFieldFamily): string {
    switch (type) {
      case 'input': return 'Input Field';
      case 'select': return 'Select Field';
      case 'datetime': return 'DateTime Field';
      case 'checkbox': return 'Checkbox Field';
      case 'list': return 'List Field';
      case 'header': return 'Header';
      case 'paragraph': return 'Paragraph';
      case 'divider': return 'Divider';
      case 'tabs': return 'Tabs';
    }
  }

  elementSummary(element: CustomFormElement): string {
    switch (element.type) {
      case 'input':
        return `${element.inputMode} - key ${element.key || 'unset'}`;
      case 'select':
        return `${element.selectMode} - ${element.options.length} option${element.options.length === 1 ? '' : 's'}`;
      case 'datetime':
        return `${element.dateTimeMode} - key ${element.key || 'unset'}`;
      case 'checkbox':
        return `${element.checkboxMode} - key ${element.key || 'unset'}`;
      case 'list':
        return `${element.fields.length} child field${element.fields.length === 1 ? '' : 's'} - key ${element.key || 'unset'}`;
      case 'header':
        return element.level.toUpperCase();
      case 'paragraph':
        return 'Body copy';
      case 'divider':
        return `${element.dividerStyle} divider`;
      case 'tabs':
        return element.tabs.map(tab => tab.label || 'Untitled tab').join(' / ');
    }
  }

  listFieldSummary(field: CustomFormListItemField): string {
    switch (field.type) {
      case 'input':
        return `${field.inputMode} - key ${field.key || 'unset'}`;
      case 'select':
        return `${field.selectMode} - ${field.options.length} option${field.options.length === 1 ? '' : 's'}`;
      case 'datetime':
        return `${field.dateTimeMode} - key ${field.key || 'unset'}`;
      case 'checkbox':
        return `${field.checkboxMode} - key ${field.key || 'unset'}`;
    }
  }

  tabLabelFor(tabId: string | null | undefined): string {
    if (!tabId) return 'Unassigned';
    return this.availableTabs().find(tab => tab.id === tabId)?.label || 'Unassigned';
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
        if (form) this.hydrateForm(form);
        else this.resetEmptyState(guide.serviceName);
        this.loading.set(false);
      },
      error: () => this.handleLoadFailure()
    });
  }

  private hydrateForm(form: DevUserServiceForm): void {
    const elements = this.extractLoadedElements(form);
    this.formId.set(form.formId);
    this.formLabel = form.label;
    this.formDescription = form.description ?? '';
    this.responseMode = form.responseMode;
    this.productionWebhookUrl = form.productionWebhookUrl ?? '';
    this.payloadTemplateText = JSON.stringify(form.payloadTemplate ?? { source: 'custom-form' }, null, 2);
    this.elements.set(elements);
    this.syncCounters(elements);
    this.selectedTarget.set('form');
    this.lastSavedSnapshot = this.snapshot();
    this.validationError.set(null);
  }

  private resetEmptyState(serviceName = this.guide()?.serviceName ?? 'Service'): void {
    this.formId.set(null);
    this.formLabel = `${serviceName} Form`;
    this.formDescription = '';
    this.responseMode = 'inline';
    this.productionWebhookUrl = '';
    this.payloadTemplateText = '{\n  "source": "custom-form"\n}';
    this.elements.set([]);
    this.syncCounters([]);
    this.selectedTarget.set('form');
    this.lastSavedSnapshot = this.snapshot();
    this.validationError.set(null);
  }

  private validate(): string | null {
    if (!this.formLabel.trim()) return 'Form label is required.';
    if (!this.productionWebhookUrl.trim()) return 'Production webhook URL is required.';
    try {
      new URL(this.productionWebhookUrl.trim());
    } catch {
      return 'Production webhook URL must be absolute.';
    }

    const fieldKeys = new Set<string>();
    const tabsElements = this.elements().filter((element): element is CustomFormTabsElement => element.type === 'tabs');
    if (tabsElements.length > 1) return 'Only one tabs element can be added to a form.';

    const availableTabIds = new Set((tabsElements[0]?.tabs ?? []).map(tab => tab.id));

    for (const element of this.elements()) {
      if (element.type === 'input' || element.type === 'select' || element.type === 'datetime' || element.type === 'checkbox' || element.type === 'list') {
        const key = element.key.trim();
        if (!key) return `${this.elementTypeLabel(element.type)} requires a key.`;
        if (fieldKeys.has(key.toLowerCase())) return `Field key "${key}" must be unique.`;
        fieldKeys.add(key.toLowerCase());

        if (!element.label.trim()) return `Field "${key}" requires a label.`;

        if (element.type === 'input') {
          const isInputHidden = (element.hidden ?? false) || element.inputMode === 'hidden';
          if (isInputHidden && !(element.defaultValueText ?? '').trim()) return `Hidden field "${key}" requires a default value.`;
        }

        if (element.type === 'select' && element.options.some(option => !option.label.trim())) {
          return `Select field "${key}" contains an option without a label.`;
        }

        if (element.type === 'checkbox' && element.checkboxMode === 'radio' && element.options.some(option => !option.label.trim())) {
          return `Checkbox field "${key}" contains an option without a label.`;
        }

        if (element.type === 'list') {
          if (element.fields.length === 0) return `List field "${key}" requires at least one child field.`;
          const childKeys = new Set<string>();
          for (const childField of element.fields) {
            const childKey = childField.key.trim();
            if (!childKey) return `List field "${key}" contains a child field without a key.`;
            if (!childField.label.trim()) return `List field "${key}" child field "${childKey}" requires a label.`;
            if (childKeys.has(childKey.toLowerCase())) return `List field "${key}" contains duplicate child key "${childKey}".`;
            childKeys.add(childKey.toLowerCase());

            if (childField.type === 'input') {
              const isHidden = (childField.hidden ?? false) || childField.inputMode === 'hidden';
              if (isHidden && !(childField.defaultValueText ?? '').trim()) {
                return `List field "${key}" hidden child field "${childKey}" requires a default value.`;
              }
            }

            if (childField.type === 'select' && childField.options.some(option => !option.label.trim())) {
              return `List field "${key}" child field "${childKey}" contains an option without a label.`;
            }

            if (childField.type === 'checkbox' && childField.checkboxMode === 'radio' && childField.options.some(option => !option.label.trim())) {
              return `List field "${key}" child field "${childKey}" contains an option without a label.`;
            }
          }

          if (element.minItems !== null && element.maxItems !== null && element.minItems !== undefined && element.maxItems !== undefined && element.minItems > element.maxItems) {
            return `List field "${key}" has a minimum item count greater than the maximum.`;
          }
        }
      }

      if (element.type === 'tabs') {
        if (element.tabs.length === 0) return 'Tabs element requires at least one tab.';
        const seen = new Set<string>();
        for (const tab of element.tabs) {
          if (!tab.label.trim()) return 'Each tab requires a label.';
          if (seen.has(tab.id)) return `Tab id "${tab.id}" must be unique.`;
          seen.add(tab.id);
        }
      }

      if (element.tabId && !availableTabIds.has(element.tabId)) {
        return `Element "${this.elementTitle(element, 0)}" references an unknown tab.`;
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

  private createElement(type: CustomFormElement['type']): CustomFormElement {
    const id = this.createElementId();

    switch (type) {
      case 'input':
        return {
          id,
          type: 'input',
          inputMode: 'text',
          key: '',
          name: '',
          label: '',
          placeholder: '',
          defaultValueText: '',
          required: false,
          hidden: false,
          formatter: '',
          validation: {}
        };
      case 'select':
        return {
          id,
          type: 'select',
          selectMode: 'dropdown',
          key: '',
          name: '',
          label: '',
          placeholder: '',
          defaultValueText: '',
          required: false,
          searchable: false,
          options: [this.createOption()]
        };
      case 'datetime':
        return {
          id,
          type: 'datetime',
          dateTimeMode: 'date',
          key: '',
          name: '',
          label: '',
          placeholder: '',
          defaultValueText: '',
          required: false,
          minValue: '',
          maxValue: '',
          relativeMin: '',
          relativeMax: ''
        };
      case 'checkbox':
        return {
          id,
          type: 'checkbox',
          checkboxMode: 'checkbox',
          key: '',
          name: '',
          label: '',
          required: false,
          hidden: false,
          options: [this.createOption()],
          parentKey: ''
        };
      case 'list':
        return {
          id,
          type: 'list',
          key: '',
          name: '',
          label: '',
          addButtonLabel: 'Add item',
          emptyStateText: 'No items added yet.',
          itemLabel: 'Item',
          minItems: null,
          maxItems: null,
          fields: [this.createListField('input')]
        };
      case 'header':
        return { id, type: 'header', text: 'Section Header', level: 'h2' };
      case 'paragraph':
        return { id, type: 'paragraph', text: 'Describe the section for the client here.' };
      case 'divider':
        return { id, type: 'divider', dividerStyle: 'solid' };
      case 'tabs': {
        const firstTab = this.createTab('Overview');
        return { id, type: 'tabs', tabs: [firstTab], activeTabId: firstTab.id };
      }
    }
  }

  private createListField(type: CustomFormFieldFamily): CustomFormListItemField {
    this.listFieldCounter += 1;
    const id = `list-field-${this.listFieldCounter}`;

    switch (type) {
      case 'input':
        return {
          id,
          type: 'input',
          key: '',
          name: '',
          label: '',
          inputMode: 'text',
          placeholder: '',
          defaultValueText: '',
          required: false,
          hidden: false,
          formatter: '',
          validation: {}
        };
      case 'select':
        return {
          id,
          type: 'select',
          key: '',
          name: '',
          label: '',
          selectMode: 'dropdown',
          placeholder: '',
          defaultValueText: '',
          required: false,
          searchable: false,
          options: [this.createOption()]
        };
      case 'datetime':
        return {
          id,
          type: 'datetime',
          key: '',
          name: '',
          label: '',
          dateTimeMode: 'date',
          placeholder: '',
          defaultValueText: '',
          required: false,
          minValue: '',
          maxValue: '',
          relativeMin: '',
          relativeMax: ''
        };
      case 'checkbox':
        return {
          id,
          type: 'checkbox',
          key: '',
          name: '',
          label: '',
          checkboxMode: 'checkbox',
          required: false,
          hidden: false,
          options: [this.createOption()],
          parentKey: ''
        };
    }
  }

  private createOption(): CustomFormOption {
    this.optionCounter += 1;
    return {
      id: `option-${this.optionCounter}`,
      label: '',
      value: ''
    };
  }

  private createTab(label = ''): CustomFormTab {
    this.tabCounter += 1;
    return {
      id: `tab-${this.tabCounter}`,
      label
    };
  }

  private createElementId(): string {
    this.elementCounter += 1;
    return `element-${this.elementCounter}`;
  }

  private updateElement(elementId: string, updater: (element: CustomFormElement) => void): void {
    this.elements.update(items => items.map(item => {
      if (item.id !== elementId) return item;
      const clone = structuredClone(item);
      updater(clone);
      return clone;
    }));
    this.touch();
  }

  private updateListField(listElementId: string, fieldId: string, updater: (field: CustomFormListItemField) => void): void {
    this.updateElement(listElementId, element => {
      if (element.type !== 'list') return;
      element.fields = element.fields.map(field => {
        if (field.id !== fieldId) return field;
        const clone = structuredClone(field);
        updater(clone);
        return clone;
      });
    });
  }

  private updateSelectedInput(patch: Partial<CustomFormInputElement>): void {
    const element = this.selectedInputElement();
    if (!element) return;
    this.updateElement(element.id, target => {
      if (target.type !== 'input') return;
      Object.assign(target, patch);
    });
  }

  private updateSelectedInputValidation(patch: Partial<NonNullable<CustomFormInputElement['validation']>>): void {
    const element = this.selectedInputElement();
    if (!element) return;
    this.updateElement(element.id, target => {
      if (target.type !== 'input') return;
      target.validation = { ...(target.validation ?? {}), ...patch };
    });
  }

  private updateSelectedSelect(patch: Partial<CustomFormSelectElement>): void {
    const element = this.selectedSelectElement();
    if (!element) return;
    this.updateElement(element.id, target => {
      if (target.type !== 'select') return;
      Object.assign(target, patch);
    });
  }

  private updateSelectedDateTime(patch: Partial<CustomFormDateTimeElement>): void {
    const element = this.selectedDateTimeElement();
    if (!element) return;
    this.updateElement(element.id, target => {
      if (target.type !== 'datetime') return;
      Object.assign(target, patch);
    });
  }

  private updateSelectedCheckbox(patch: Partial<CustomFormCheckboxElement>): void {
    const element = this.selectedCheckboxElement();
    if (!element) return;
    this.updateElement(element.id, target => {
      if (target.type !== 'checkbox') return;
      Object.assign(target, patch);
    });
  }

  private updateSelectedList(patch: Partial<CustomFormListElement>): void {
    const element = this.selectedListElement();
    if (!element) return;
    this.updateElement(element.id, target => {
      if (target.type !== 'list') return;
      Object.assign(target, patch);
    });
  }

  private updateSelectedHeader(patch: Partial<CustomFormHeaderElement>): void {
    const element = this.selectedHeaderElement();
    if (!element) return;
    this.updateElement(element.id, target => {
      if (target.type !== 'header') return;
      Object.assign(target, patch);
    });
  }

  private updateSelectedParagraph(patch: Partial<CustomFormParagraphElement>): void {
    const element = this.selectedParagraphElement();
    if (!element) return;
    this.updateElement(element.id, target => {
      if (target.type !== 'paragraph') return;
      Object.assign(target, patch);
    });
  }

  private updateSelectedDivider(patch: Partial<CustomFormDividerElement>): void {
    const element = this.selectedDividerElement();
    if (!element) return;
    this.updateElement(element.id, target => {
      if (target.type !== 'divider') return;
      Object.assign(target, patch);
    });
  }

  private tryParsePayloadTemplate(): Record<string, unknown> | null {
    try {
      const parsed = JSON.parse(this.payloadTemplateText);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return null;
    }
  }

  private parseUserServiceId(value: string | null): number | null {
    if (!value?.trim() || !/^\d+$/.test(value)) return null;
    const userServiceId = Number(value);
    return Number.isSafeInteger(userServiceId) && userServiceId > 0 ? userServiceId : null;
  }

  private syncCounters(elements: CustomFormElement[]): void {
    this.elementCounter = this.highestNumericSuffix(elements.map(element => element.id), 'element');
    const options = [
      ...elements
        .filter((element): element is CustomFormSelectElement | CustomFormCheckboxElement => element.type === 'select' || element.type === 'checkbox')
        .flatMap(element => element.options.map(option => option.id)),
      ...elements
        .filter((element): element is CustomFormListElement => element.type === 'list')
        .flatMap(element =>
          element.fields
            .filter((field): field is CustomFormListItemSelectField | CustomFormListItemCheckboxField => field.type === 'select' || field.type === 'checkbox')
            .flatMap(field => field.options.map(option => option.id))
        )
    ];
    this.optionCounter = this.highestNumericSuffix(options, 'option');
    const tabs = elements
      .filter((element): element is CustomFormTabsElement => element.type === 'tabs')
      .flatMap(element => element.tabs.map(tab => tab.id));
    this.tabCounter = this.highestNumericSuffix(tabs, 'tab');
    const listFields = elements
      .filter((element): element is CustomFormListElement => element.type === 'list')
      .flatMap(element => element.fields.map(field => field.id));
    this.listFieldCounter = this.highestNumericSuffix(listFields, 'list-field');
  }

  private highestNumericSuffix(ids: string[], prefix: string): number {
    return ids.reduce((highest, id) => {
      const match = new RegExp(`^${prefix}-(\\d+)$`).exec(id);
      if (!match) return highest;
      return Math.max(highest, Number(match[1]));
    }, 0);
  }

  touch(): void {
    this.validationError.set(null);
  }

  private extractLoadedElements(form: DevUserServiceForm): CustomFormElement[] {
    const schema = form.schema as unknown as Record<string, unknown> | null | undefined;
    const directElements = Array.isArray(schema?.['elements']) ? schema?.['elements'] as unknown[] : null;
    if (directElements) {
      return directElements.map(element => structuredClone(element as CustomFormElement));
    }

    const directFields = Array.isArray(schema?.['fields']) ? schema?.['fields'] as DynamicFieldConfig[] : null;
    if (directFields) {
      return directFields.map((field, index) => this.fromLegacyField(field, index));
    }

    const nestedSchema = schema?.['schema'] as Record<string, unknown> | null | undefined;
    const nestedElements = Array.isArray(nestedSchema?.['elements']) ? nestedSchema?.['elements'] as unknown[] : null;
    if (nestedElements) {
      return nestedElements.map(element => structuredClone(element as CustomFormElement));
    }

    const nestedFields = Array.isArray(nestedSchema?.['fields']) ? nestedSchema?.['fields'] as DynamicFieldConfig[] : null;
    if (nestedFields) {
      return nestedFields.map((field, index) => this.fromLegacyField(field, index));
    }

    return [];
  }

  private fromLegacyField(field: DynamicFieldConfig, index: number): CustomFormElement {
    const id = this.createElementId();
    const key = field.key?.trim() || `legacy_field_${index + 1}`;
    const label = field.label?.trim() || key;
    const name = field.name?.trim() || '';
    const placeholder = field.placeholder?.trim() || '';
    const defaultValueText = this.stringifyLegacyValue(field.defaultValue);

    switch (field.type) {
      case 'select':
      case 'multi-select':
      case 'multiSelect':
        return {
          id,
          type: 'select',
          selectMode: field.type === 'select' ? 'dropdown' : 'multiSelect',
          key,
          name,
          label,
          placeholder,
          defaultValueText,
          required: field.required ?? false,
          searchable: false,
          options: (field.options ?? []).map(option => this.fromLegacyOption(option))
        };
      case 'date':
      case 'time':
      case 'datetime':
      case 'dateRange':
        return {
          id,
          type: 'datetime',
          dateTimeMode: field.type === 'date'
            ? 'date'
            : field.type === 'time'
              ? 'time'
              : field.type === 'datetime'
                ? 'dateTime'
                : 'dateRange',
          key,
          name,
          label,
          placeholder,
          defaultValueText,
          required: field.required ?? false,
          minValue: field.validation?.min?.toString() ?? '',
          maxValue: field.validation?.max?.toString() ?? '',
          relativeMin: '',
          relativeMax: ''
        };
      case 'checkbox':
      case 'toggle':
        return {
          id,
          type: 'checkbox',
          checkboxMode: 'checkbox',
          key,
          name,
          label,
          required: field.required ?? false,
          hidden: field.hidden ?? false,
          options: (field.options ?? []).map(option => this.fromLegacyOption(option)),
          parentKey: ''
        };
      default:
        return {
          id,
          type: 'input',
          inputMode: this.fromLegacyInputMode(field.type),
          key,
          name,
          label,
          placeholder,
          defaultValueText,
          required: field.required ?? false,
          hidden: field.hidden ?? field.type === 'hidden',
          formatter: field.formatter ?? '',
          validation: {
            min: field.validation?.min ?? null,
            max: field.validation?.max ?? null,
            maxLength: field.validation?.maxLength ?? null,
            regex: field.validation?.regex ?? ''
          }
        };
    }
  }

  private fromLegacyInputMode(type: DynamicFieldConfig['type']): CustomFormInputElement['inputMode'] {
    switch (type) {
      case 'textarea':
        return 'textarea';
      case 'richText':
        return 'richText';
      case 'number':
        return 'number';
      case 'email':
        return 'email';
      case 'hidden':
        return 'hidden';
      default:
        return 'text';
    }
  }

  private fromLegacyOption(option: DynamicFieldOption): CustomFormOption {
    return {
      id: `option-${++this.optionCounter}`,
      label: option.label ?? '',
      value: this.stringifyLegacyValue(option.value)
    };
  }

  private stringifyLegacyValue(value: unknown): string {
    if (value === undefined || value === null) return '';
    return typeof value === 'string' ? value : JSON.stringify(value);
  }

  private snapshot(): string {
    return JSON.stringify({
      formId: this.formId(),
      label: this.formLabel.trim(),
      description: this.formDescription.trim(),
      responseMode: this.responseMode,
      productionWebhookUrl: this.productionWebhookUrl.trim(),
      payloadTemplateText: this.payloadTemplateText,
      elements: this.elements()
    });
  }
}
