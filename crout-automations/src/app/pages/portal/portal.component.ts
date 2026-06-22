import { Component, inject, computed, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { CompanyService } from '../../services/company.service';

@Component({
  selector: 'ca-portal',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './portal.component.html',
  styleUrls: ['./portal.component.scss'],
})
export class PortalComponent implements OnInit {
  private readonly auth       = inject(AuthService);
  private readonly companySvc = inject(CompanyService);
  private readonly router     = inject(Router);

  readonly user = computed(() => this.auth.currentUser());

  /** Read from shared cache — no extra HTTP call. */
  readonly companies      = this.companySvc.companies;
  readonly primaryCompany = this.companySvc.primaryCompany;
  sidebarOpen = false;

  readonly initials = computed(() => {
    const u = this.user();
    if (!u) return '';
    return ((u.firstName?.[0] ?? '') + (u.surname?.[0] ?? '')).toUpperCase() || u.username[0].toUpperCase();
  });

  ngOnInit(): void {
    const uid = this.user()?.userId;
    if (uid == null) return;
    // Reads from cache — only fires an HTTP request if not already loaded.
    this.companySvc.load(uid);
  }

  openSidebar(): void { this.sidebarOpen = true; }

  closeSidebar(): void { this.sidebarOpen = false; }

  logout(): void {
    this.companySvc.clear();
    this.auth.logout();
  }
}
