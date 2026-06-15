import { Injectable, inject, computed } from '@angular/core';
import { AuthService } from './auth.service';
import { CompanyService } from './company.service';

/**
 * ShellContextService
 * -------------------
 * Centralises the user/company context that was previously duplicated across
 * admin.component.ts and portal.component.ts.
 *
 * Both standalone sidebar components and all sub-pages can inject this service
 * instead of wiring AuthService + CompanyService individually for shell-level
 * concerns (user identity, initials, primary company, logout).
 */
@Injectable({ providedIn: 'root' })
export class ShellContextService {
  private readonly auth       = inject(AuthService);
  private readonly companySvc = inject(CompanyService);

  /** Currently authenticated user signal. */
  readonly currentUser = computed(() => this.auth.currentUser());

  /** Two-letter initials derived from firstName + surname, falls back to username[0]. */
  readonly initials = computed(() => {
    const u = this.currentUser();
    if (!u) return '';
    return (
      (u.firstName?.[0] ?? '') + (u.surname?.[0] ?? '')
    ).toUpperCase() || u.username[0].toUpperCase();
  });

  /** Whether the current user has admin privileges. */
  readonly isAdmin = computed(() => !!this.currentUser()?.isAdmin);

  /** Primary company name for portal display — reads from CompanyService cache. */
  readonly primaryCompany = this.companySvc.primaryCompany;

  /** All cached companies — reads from CompanyService cache. */
  readonly companies = this.companySvc.companies;

  /**
   * Load companies for the given user ID.
   * CompanyService is cache-aware — no extra HTTP request is fired if already loaded.
   */
  loadCompanies(userId: number): void {
    this.companySvc.load(userId);
  }

  /**
   * Log out the current user.
   * Clears the company cache first, then delegates to AuthService.
   */
  logout(): void {
    this.companySvc.clear();
    this.auth.logout();
  }
}
