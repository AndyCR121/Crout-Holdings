import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

export type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

@Component({
  selector: 'ch-contact-us',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact-us.component.html',
  styleUrl: './contact-us.component.scss'
})
export class ContactUsComponent {
  status: FormStatus = 'idle';

  readonly categories = [
    { value: 'general',              label: 'General' },
    { value: 'support',              label: 'Support' },
    { value: 'sales',                label: 'Sales' },
    { value: 'division-automations', label: 'Division — Automations' },
    { value: 'division-security',    label: 'Division — Security' },
    { value: 'division-properties',  label: 'Division — Properties' },
    { value: 'division-auto',        label: 'Division — Auto' },
    { value: 'division-saas',        label: 'Division — SAAS' },
  ];

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name:     ['', [Validators.required, Validators.minLength(2)]],
      email:    ['', [Validators.required, Validators.email]],
      company:  [''],
      category: ['', Validators.required],
      message:  ['', [Validators.required, Validators.minLength(10)]],
    });
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

    /**
     * TODO: replace this stub with your real submission logic.
     * Options:
     *   - WordPress AJAX / REST endpoint
     *   - EmailJS  (emailjs.com)
     *   - Formspree (formspree.io)
     *   - Your own API
     *
     * Example (Formspree):
     *   const res = await fetch('https://formspree.io/f/YOUR_ID', {
     *     method: 'POST',
     *     headers: { 'Content-Type': 'application/json' },
     *     body: JSON.stringify(this.form.value)
     *   });
     *   this.status = res.ok ? 'success' : 'error';
     */
    await new Promise(r => setTimeout(r, 900)); // remove when wired up
    this.status = 'success';
  }

  reset(): void {
    this.form.reset();
    this.status = 'idle';
  }
}
