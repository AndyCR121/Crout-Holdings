import { Component, inject, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'ca-portal',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './portal.component.html',
  styleUrls: ['./portal.component.scss'],
})
export class PortalComponent {
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  readonly user     = computed(() => this.auth.currentUser());
  readonly initials = computed(() => {
    const u = this.user();
    if (!u) return '';
    return ((u.FirstName?.[0] ?? '') + (u.Surname?.[0] ?? '')).toUpperCase() || u.Username[0].toUpperCase();
  });

  logout(): void { this.auth.logout(); }
}
