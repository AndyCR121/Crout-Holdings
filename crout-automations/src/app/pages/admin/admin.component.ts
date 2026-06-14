import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Admin shell — thin redirect stub.
 * No router-outlet, no layout logic.
 * Navbar, footer & account-button are handled by app.component.
 * Each sub-page (users, services, packages, companies, addons,
 * service-features) is standalone and renders its own <ca-admin-left-menu>.
 */
@Component({
  selector: 'ca-admin',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content />`,
  styles: [`:host { display: block; }`]
})
export class AdminComponent {}
