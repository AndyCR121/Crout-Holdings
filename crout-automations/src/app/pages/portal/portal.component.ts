import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Portal shell — thin redirect stub.
 * No router-outlet, no layout logic.
 * Navbar, footer & account-button are handled by app.component.
 * Each sub-page (dashboard, profile, services, billing) is standalone
 * and renders its own <ca-portal-left-menu>.
 */
@Component({
  selector: 'ca-portal',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content />`,
  styles: [`:host { display: block; }`]
})
export class PortalComponent {}
