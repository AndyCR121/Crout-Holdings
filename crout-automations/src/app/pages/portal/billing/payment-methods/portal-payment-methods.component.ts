import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ca-portal-payment-methods',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portal-payment-methods.component.html',
  styleUrls: ['./portal-payment-methods.component.scss'],
})
export class PortalPaymentMethodsComponent {
  // TODO: integrate Paystack — inject PaystackService and load saved cards here
}
