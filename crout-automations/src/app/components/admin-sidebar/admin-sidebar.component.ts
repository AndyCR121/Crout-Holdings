import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShellContextService } from '../../services/shell-context.service';

/**
 * AdminSidebarComponent
 * ---------------------
 * Standalone sidebar for the Admin section.
 * Extracted from admin.component so it can be embedded directly into each
 * admin sub-page without requiring a router-outlet or parent shell.
 *
 * Active-link detection uses window.location.pathname since these pages
 * are not rendered through Angular's router-outlet.
 */
@Component({
  selector: 'ca-admin-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-sidebar.component.html',
  styleUrls: ['./admin-sidebar.component.scss'],
})
export class AdminSidebarComponent {
  private readonly shell = inject(ShellContextService);

  readonly user     = computed(() => this.shell.currentUser());
  readonly initials = computed(() => this.shell.initials());
  sidebarOpen = false;

  isActive(path: string): boolean {
    return typeof window !== 'undefined' && window.location.pathname === path;
  }

  openSidebar(): void { this.sidebarOpen = true; }

  closeSidebar(): void { this.sidebarOpen = false; }

  logout(): void { this.shell.logout(); }
}
