import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CompanyService } from '../../services/company.service';
import { PortalLeftMenuComponent } from '../../components/left-menu/portal-left-menu.component';

@Component({
  selector: 'ca-portal',
  standalone: true,
  imports: [CommonModule, RouterOutlet, PortalLeftMenuComponent],
  templateUrl: './portal.component.html',
  styleUrls: ['./portal.component.scss'],
})
export class PortalComponent implements OnInit {
  private readonly auth       = inject(AuthService);
  private readonly companySvc = inject(CompanyService);

  readonly user = computed(() => this.auth.currentUser());

  ngOnInit(): void {
    const uid = this.user()?.userId;
    if (uid == null) return;
    this.companySvc.load(uid);
  }
}
