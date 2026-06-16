import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';
import * as emailjs from '@emailjs/browser';

export type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

@Component({
  selector: 'ch-contact-us',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact-us.component.html',
  styleUrl: './contact-us.component.scss'
})
export class ContactUsComponent implements OnInit {
  status: FormStatus = 'idle';

  readonly categories = [
    { value: 'general', label: 'General' },
    { value: 'support', label: 'Support' },
    { value: 'sales', label: 'Sales' },
    { value: 'division-automations', label: 'Division \u2014 Automations' },
    // { value: 'division-security',  label: 'Division \u2014 Security' },
    { value: 'division-properties', label: 'Division \u2014 Properties' },
    { value: 'division-auto', label: 'Division \u2014 Auto' },
    { value: 'division-saas', label: 'Division \u2014 SAAS' },
  ];

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      company: [''],
      category: ['', Validators.required],
      message: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  ngOnInit(): void {
    emailjs.init(environment.emailjs.publicKey);
  }

  get f() { return this.form.controls; }

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.status = 'submitting';

    try {
      const { name, email, company, category, message } = this.form.value;

      const templateParams = {
        from_name_surname: name,
        from_email: email,
        company: company || 'N/A',
        category: this.categories.find(c => c.value === category)?.label ?? category,
        message,
      };

      await emailjs.send(
        environment.emailjs.serviceId,
        environment.emailjs.templateId,
        templateParams
      );

      this.status = 'success';
    } catch (err) {
      console.error('EmailJS error:', err);
      this.status = 'error';
    }
  }

  reset(): void {
    this.form.reset();
    this.status = 'idle';
  }
}
