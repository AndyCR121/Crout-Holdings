import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';

export interface PendingChangesComponent {
  hasPendingChanges(): boolean;
}

export const pendingChangesGuard: CanDeactivateFn<PendingChangesComponent> = component => {
  if (!component.hasPendingChanges()) return true;
  return window.confirm('You have unsaved form changes. Leave this page?');
};
