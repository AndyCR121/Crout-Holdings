import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CompanyService } from '../../services/company.service';

@Component({
  selector: 'ca-portal-left-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portal-left-menu.component.html',
  styleUrls: ['./portal-left-menu.component.scss'],
})
export class PortalLeftMenuComponent implements OnInit {
  private readonly auth       = inject(AuthService);
  private readonly companySvc = inject(CompanyService);
  private readonly router     = inject(Router);

  readonly user           = computed(() => this.auth.currentUser());
  readonly companies      = this.companySvc.companies;
  readonly primaryCompany = this.companySvc.primaryCompany;

  readonly initials = computed(() => {
    const u = this.user();
    if (!u) return '';
    return ((u.firstName?.[0] ?? '') + (u.surname?.[0] ?? '')).toUpperCase()
      || u.username[0].toUpperCase();
  });

  readonly currentPath = computed(() => this.router.url);

  ngOnInit(): void {
    const uid = this.user()?.userId;
    if (uid == null) return;
    this.companySvc.load(uid);
  }

  logout(): void {
    this.companySvc.clear();
    this.auth.logout();
  }
}
