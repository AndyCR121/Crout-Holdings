import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortalLeftMenuComponent } from '../../../components/left-menu/portal-left-menu.component';

@Component({
  selector: 'ca-portal-billing',
  standalone: true,
  imports: [CommonModule, PortalLeftMenuComponent],
  templateUrl: './portal-billing.component.html',
  styleUrls: ['./portal-billing.component.scss'],
})
export class PortalBillingComponent {}
