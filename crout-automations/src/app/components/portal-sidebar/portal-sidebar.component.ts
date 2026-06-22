import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShellContextService } from '../../services/shell-context.service';

/**
 * PortalSidebarComponent
 * ----------------------
 * Standalone sidebar for the Client Portal section.
 * Extracted from portal.component so it can be embedded directly into each
 * portal sub-page without requiring a router-outlet or parent shell.
 *
 * Active-link detection uses window.location.pathname since these pages
 * are not rendered through Angular's router-outlet.
 */
@Component({
  selector: 'ca-portal-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portal-sidebar.component.html',
  styleUrls: ['./portal-sidebar.component.scss'],
})
export class PortalSidebarComponent implements OnInit {
  private readonly shell = inject(ShellContextService);

  readonly user           = computed(() => this.shell.currentUser());
  readonly initials       = computed(() => this.shell.initials());
  readonly primaryCompany = this.shell.primaryCompany;
  readonly isAdmin        = computed(() => this.shell.isAdmin());
  readonly isDev          = computed(() => !!this.user()?.isDev);
  sidebarOpen = false;

  ngOnInit(): void {
    const uid = this.user()?.userId;
    if (uid != null) this.shell.loadCompanies(uid);
  }

  isActive(path: string): boolean {
    return typeof window !== 'undefined' && (window.location.pathname === path || window.location.pathname.startsWith(path));
  }

  portalLabel(): string {
    return this.isActive('/dev') ? 'Dev Portal' : 'Client Portal';
  }

  openSidebar(): void { this.sidebarOpen = true; }

  closeSidebar(): void { this.sidebarOpen = false; }

  logout(): void { this.shell.logout(); }
}
