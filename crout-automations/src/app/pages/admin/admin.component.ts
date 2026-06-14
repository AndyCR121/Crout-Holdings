import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AdminLeftMenuComponent } from '../../components/left-menu/admin-left-menu.component';

@Component({
  selector: 'ca-admin',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AdminLeftMenuComponent],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent implements OnInit {
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = computed(() => this.auth.currentUser());

  ngOnInit(): void {
    const user = this.user();
    if (!user || !user.isAdmin) this.router.navigate(['/']);
  }
}
