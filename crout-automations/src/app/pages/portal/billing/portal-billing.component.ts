import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'ca-portal-billing',
  standalone: true,
  imports: [],
  templateUrl: './portal-billing.component.html',
  styleUrls: ['./portal-billing.component.scss'],
})
export class PortalBillingComponent implements OnInit {
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.router.navigate(['/client/billing/subscriptions'], { replaceUrl: true });
  }
}
