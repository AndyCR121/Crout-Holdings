import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

@Injectable({ providedIn: 'root' })
export class FormValidatorService {

  /** South African phone: 10 digits, optionally prefixed with +27 */
  saPhone(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const cleaned = control.value.replace(/[\s\-()]/g, '');
      const valid = /^(\+27|0)[6-8][0-9]{8}$/.test(cleaned);
      return valid ? null : { saPhone: true };
    };
  }

  /** Human-readable error message for a control */
  getMessage(control: AbstractControl, fieldName: string): string {
    if (!control.errors || !control.touched) return '';
    if (control.errors['required'])  return `${fieldName} is required`;
    if (control.errors['email'])     return 'Enter a valid email address';
    if (control.errors['saPhone'])   return 'Enter a valid South African number (e.g. 082 123 4567)';
    if (control.errors['minlength']) {
      const min = control.errors['minlength'].requiredLength;
      return `${fieldName} must be at least ${min} characters`;
    }
    if (control.errors['maxlength']) {
      const max = control.errors['maxlength'].requiredLength;
      return `${fieldName} cannot exceed ${max} characters`;
    }
    return 'Invalid value';
  }
}
