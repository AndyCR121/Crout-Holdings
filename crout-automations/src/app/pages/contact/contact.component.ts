import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule, FormGroupDirective } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FormValidatorService } from '../../services/form-validator.service';
import { ContactConfig, WebhookService } from '../../services/webhook.service';

type FormState = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'ca-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent {
  private readonly fb       = inject(FormBuilder);
  private readonly validator = inject(FormValidatorService);
  private readonly webhook   = inject(WebhookService);
  private readonly route     = inject(ActivatedRoute);

  formState = signal<FormState>('idle');
  errorMessage = signal('');
  selectedConfig = signal<ContactConfig | null>(null);
  referral = signal('');

  readonly services = [
    'WhatsApp AI Agent',
    'Quote System',
    'Project Management System',
    'Marketing Systems',
    'Custom Automation Workflow',
    'Not sure yet — I need advice'
  ];

  public form = this.fb.group({
    name:     ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email:    ['', [Validators.required, Validators.email]],
    phone:    ['', [this.validator.saPhone()]],
    business: ['', [Validators.maxLength(100)]],
    service:  ['', [Validators.required]],
    message:  ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]]
  });

  constructor() {
    const query = this.route.snapshot.queryParamMap;
    const service = query.get('service') ?? query.get('package');
    const referral = query.get('referral') ?? '';
    const encodedConfig = query.get('config');

    if (service) this.form.patchValue({ service });
    if (referral) this.referral.set(referral);

    if (encodedConfig) {
      try {
        const config = JSON.parse(decodeURIComponent(encodedConfig)) as ContactConfig;
        this.selectedConfig.set(config);
        this.form.patchValue({
          service: config.serviceName ?? config.packageName ?? service ?? '',
          message: this.buildConfigMessage(config)
        });
      } catch {
        this.selectedConfig.set(null);
      }
    }
  }

  err(field: string): string {
    const control = this.form.get(field)!;
    const labels: Record<string, string> = {
      name: 'Name', email: 'Email', phone: 'Phone',
      business: 'Business name', service: 'Service', message: 'Message'
    };
    return this.validator.getMessage(control, labels[field] ?? field);
  }

  get charCount(): number {
    return this.form.get('message')?.value?.length ?? 0;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.formState.set('loading');
    const v = this.form.getRawValue();
    this.webhook.submitContact({
      name:      v.name     ?? '',
      email:     v.email    ?? '',
      phone:     v.phone    ?? '',
      business:  v.business ?? '',
      service:   v.service  ?? '',
      message:   v.message  ?? '',
      referral:  this.referral(),
      config:    this.selectedConfig(),
      source:    'Crout Automations website',
      timestamp: new Date().toISOString()
    }).subscribe({
      next:  () => this.formState.set('success'),
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.formState.set('error');
      }
    });
  }

  reset(): void {
    this.form.reset();
    this.formState.set('idle');
    this.errorMessage.set('');
  }

  private buildConfigMessage(config: ContactConfig): string {
    const addons = config.addons?.map(a => a.addonName).join(', ') || 'None selected';
    const total = config.discountedTotal ?? config.fullTotal ?? 0;
    return [
      'I would like to discuss this selected service configuration.',
      '',
      `Service: ${config.serviceName ?? 'Not specified'}`,
      `Package: ${config.packageName ?? 'Not specified'}`,
      `Selected add-ons: ${addons}`,
      `Estimated monthly amount: R${total.toLocaleString('en-ZA')}`
    ].join('\n');
  }
}
