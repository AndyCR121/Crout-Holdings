import { Component, inject, computed, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'ca-admin',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent implements OnInit {
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  readonly user     = computed(() => this.auth.currentUser());
  readonly initials = computed(() => {
    const u = this.user();
    if (!u) return '';
    return ((u.firstName?.[0] ?? '') + (u.surname?.[0] ?? '')).toUpperCase() || u.username[0].toUpperCase();
  });
  sidebarOpen = false;

  ngOnInit(): void {
    const user = this.user();
    if (!user || !user.isAdmin) this.router.navigate(['/']);
  }

  openSidebar(): void { this.sidebarOpen = true; }

  closeSidebar(): void { this.sidebarOpen = false; }

  logout(): void { this.auth.logout(); }
}
