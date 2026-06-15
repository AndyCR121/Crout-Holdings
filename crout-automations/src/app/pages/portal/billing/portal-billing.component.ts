import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { PortalSidebarComponent } from '../../../components/portal-sidebar/portal-sidebar.component';

@Component({
  selector: 'ca-portal-billing',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, PortalSidebarComponent],
  templateUrl: './portal-billing.component.html',
  styleUrls: ['./portal-billing.component.scss'],
})
export class PortalBillingComponent {}
