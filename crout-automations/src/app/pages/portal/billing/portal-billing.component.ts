import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'ca-portal-billing',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './portal-billing.component.html',
  styleUrls: ['./portal-billing.component.scss'],
})
export class PortalBillingComponent {}
