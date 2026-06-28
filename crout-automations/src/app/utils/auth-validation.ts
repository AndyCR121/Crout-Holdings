const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UPPERCASE_PATTERN = /[A-Z]/;
const NUMBER_PATTERN = /\d/;
const SPECIAL_CHARACTER_PATTERN = /[^A-Za-z0-9]/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function getPasswordValidationErrors(value: string): string[] {
  const password = value ?? '';
  const errors: string[] = [];

  if (password.length < 7) errors.push('Password must be at least 7 characters.');
  if (!UPPERCASE_PATTERN.test(password)) errors.push('Password must include at least one uppercase letter.');
  if (!NUMBER_PATTERN.test(password)) errors.push('Password must include at least one number.');
  if (!SPECIAL_CHARACTER_PATTERN.test(password)) errors.push('Password must include at least one special character.');

  return errors;
}
