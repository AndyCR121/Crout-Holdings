import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

/**
 * Single source of truth for runtime configuration.
 *
 * URL resolution priority:
 *  1. window.__env.apiUrl — injected at runtime by the host environment
 *     Dev/VPS Docker deploys can override the API host without rebuilding.
 *
 *  2. environment.apiUrl — set at build time via angular.json fileReplacements
 *     Dev defaults to localhost. Production keeps the current API convention.
 *
 * To change the API host for local dev, edit src/environments/environment.ts.
 */
@Injectable({ providedIn: 'root' })
export class EnvironmentService {
  readonly apiUrl: string = this._resolve();

  private _resolve(): string {
    const runtime = (window as any).__env?.apiUrl ?? '';
    if (runtime) return runtime;
    if (environment.apiUrl) return environment.apiUrl;
    if (!runtime) {
      console.warn(
        '[EnvironmentService] No API URL found.\n' +
        '  Dev:  set environment.apiUrl in src/environments/environment.ts\n' +
        '  Prod: ensure env.js or another runtime injector sets window.__env.apiUrl'
      );
    }
    return runtime;
  }
}
