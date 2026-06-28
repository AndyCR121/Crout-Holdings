import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'ca-integration-action-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button type="button" [disabled]="disabled() || loading()" [class]="buttonClass()">
      {{ loading() ? loadingLabel() : label() }}
    </button>
  `,
})
export class IntegrationActionButtonComponent {
  readonly label = input.required<string>();
  readonly loadingLabel = input('Working...');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly buttonClass = input('btn-edit');
}
