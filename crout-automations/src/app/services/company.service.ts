import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
import { ICompany } from '../interfaces/i-service.interface';
import { EnvironmentService } from './environment.service';

/**
 * Singleton company cache.
 * All consumers (portal sidebar, account-button, profile page) read from one
 * signal — the HTTP request is made exactly once per session, not once per
 * component mount.
 */
@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly http = inject(HttpClient);
  private readonly env  = inject(EnvironmentService);
  private get base(): string { return this.env.apiUrl; }

  private readonly _companies  = signal<ICompany[]>([]);
  private readonly _loading    = signal(false);
  private          _loaded     = false;

  /** Read-only views consumed by components. */
  readonly companies  = this._companies.asReadonly();
  readonly loading    = this._loading.asReadonly();

  /** First active company — used in sidebar chip and account-button. */
  readonly primaryCompany = computed(() =>
    this._companies().find(c => c.active)?.companyName ?? null
  );

  /**
   * Fetch companies for the given user ID.
   * Skips the network call if data was already loaded this session.
   * Pass force=true to bypass the cache (e.g. after add/remove).
   */
  load(userId: number, force = false): void {
    if (this._loaded && !force) return;
    this._loading.set(true);
    this.http
      .get<ICompany[]>(`${this.base}/profile/companies`, { withCredentials: true })
      .pipe(
        tap(c => {
          this._companies.set(c);
          this._loading.set(false);
          this._loaded = true;
        }),
        catchError(() => {
          this._loading.set(false);
          return of([]);
        })
      )
      .subscribe();
  }

  /** Called by profile page after a successful add/edit/delete. */
  setCompanies(list: ICompany[]): void {
    this._companies.set(list);
    this._loaded = true;
  }

  /** Optimistic update for a single company (after edit). */
  upsert(company: ICompany): void {
    this._companies.update(list => {
      const idx = list.findIndex(c => c.companyId === company.companyId);
      return idx >= 0
        ? list.map(c => c.companyId === company.companyId ? company : c)
        : [...list, company];
    });
  }

  /** Optimistic remove (after delete). */
  remove(companyId: number): void {
    this._companies.update(list => list.filter(c => c.companyId !== companyId));
  }

  /** Clear cache on logout. */
  clear(): void {
    this._companies.set([]);
    this._loaded = false;
  }
}
