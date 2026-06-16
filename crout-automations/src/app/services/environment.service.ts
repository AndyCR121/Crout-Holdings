import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

/**
 * Single source of truth for runtime configuration.
 *
 * URL resolution priority:
 *  1. environment.apiUrl  — set at build time via angular.json fileReplacements
 *     Dev:  'https://api.automations.crout-holdings.com'  (environment.ts)
 *     Prod: ''  (environment.prod.ts — defers to WordPress runtime inject below)
 *
 *  2. window.__env.apiUrl — injected by the WordPress plugin via wp_inline_script
 *     before the Angular bundle loads. Used in production.
 *
 * To change the API host for local dev, edit src/environments/environment.ts.
 */
@Injectable({ providedIn: 'root' })
export class EnvironmentService {
  readonly apiUrl: string = this._resolve();

  private _resolve(): string {
    if (environment.apiUrl) return environment.apiUrl;
    const runtime = (window as any).__env?.apiUrl ?? '';
    if (!runtime) {
      console.warn(
        '[EnvironmentService] No API URL found.\n' +
        '  Dev:  set environment.apiUrl in src/environments/environment.ts\n' +
        '  Prod: ensure the WordPress plugin injects window.__env.apiUrl'
      );
    }
    return runtime;
  }
}
