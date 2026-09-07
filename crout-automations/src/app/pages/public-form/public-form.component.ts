import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { PublicFormApiService } from '../../services/public-form-api.service';
import { ServiceTriggerRendererComponent } from '../../components/service-trigger-renderer/service-trigger-renderer.component';
import { ExecuteTriggerResponse, ServiceTriggerConfig } from '../../interfaces/i-service-trigger.interface';
import { PublicCustomFormResolved } from '../../interfaces/i-custom-form-share-link.interface';

type PageState = 'loading' | 'ready' | 'unavailable';

/**
 * Public, unauthenticated page at /forms/:token — renders exactly one Custom Form with no
 * portal chrome, login, or account context (custom-form-public-access spec, R3/R9). Reuses
 * ServiceTriggerRendererComponent's field rendering/validation verbatim via executeOverride
 * rather than forking it, so this page can never drift from the authenticated renderer.
 */
@Component({
  selector: 'ca-public-form',
  standalone: true,
  imports: [CommonModule, ServiceTriggerRendererComponent],
  templateUrl: './public-form.component.html',
  styleUrl: './public-form.component.scss',
})
export class PublicFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly publicApi = inject(PublicFormApiService);

  readonly state = signal<PageState>('loading');
  readonly resolved = signal<PublicCustomFormResolved | null>(null);
  readonly config = signal<ServiceTriggerConfig | null>(null);
  private token = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.state.set('unavailable');
      return;
    }

    this.publicApi.resolve(this.token).subscribe({
      next: result => {
        this.resolved.set(result);
        // Use the backend's config as-is — it's the same ServiceTriggerConfigDto the
        // authenticated renderer consumes, so this can never drift from it.
        this.config.set(result.config);
        this.state.set('ready');
      },
      // Any failure (never existed / expired / revoked / unpublished) renders the same
      // generic unavailable state — the response body/status is never inspected for
      // details, by design (R9: no enumeration or information disclosure).
      error: () => this.state.set('unavailable'),
    });
  }

  readonly submitOverride = (
    _config: ServiceTriggerConfig,
    payload: Record<string, unknown>,
  ): Observable<ExecuteTriggerResponse> => this.publicApi.submit(this.token, payload);
}
