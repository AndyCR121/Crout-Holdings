import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'ca-admin-left-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-left-menu.component.html',
  styleUrls: ['./admin-left-menu.component.scss'],
})
export class AdminLeftMenuComponent {
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  readonly user        = computed(() => this.auth.currentUser());
  readonly currentPath = computed(() => this.router.url);

  readonly initials = computed(() => {
    const u = this.user();
    if (!u) return '';
    return ((u.firstName?.[0] ?? '') + (u.surname?.[0] ?? '')).toUpperCase()
      || u.username[0].toUpperCase();
  });

  logout(): void { this.auth.logout(); }
}
