import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NavComponent } from '../../components/nav/nav.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { FormValidatorService } from '../../services/form-validator.service';
import { WebhookService } from '../../services/webhook.service';

type FormState = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'ca-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NavComponent, FooterComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent {
  private readonly fb       = inject(FormBuilder);
  private readonly validator = inject(FormValidatorService);
  private readonly webhook   = inject(WebhookService);

  formState = signal<FormState>('idle');
  errorMessage = signal('');

  readonly services = [
    'WhatsApp AI Agent',
    'Quoting & Invoicing Automation',
    'Job Card Automation',
    'Custom n8n Workflow',
    'Not sure yet — I need advice'
  ];

  form = this.fb.group({
    name:     ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email:    ['', [Validators.required, Validators.email]],
    phone:    ['', [this.validator.saPhone()]],
    business: ['', [Validators.maxLength(100)]],
    service:  ['', [Validators.required]],
    message:  ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]]
  });

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
}
