import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { ICompany } from '../../interfaces/i-service.interface';

@Component({
  selector: 'ca-portal',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './portal.component.html',
  styleUrls: ['./portal.component.scss'],
})
export class PortalComponent implements OnInit {
  private readonly auth   = inject(AuthService);
  private readonly api    = inject(ApiService);
  private readonly router = inject(Router);

  readonly user      = computed(() => this.auth.currentUser());
  readonly companies = signal<ICompany[]>([]);

  readonly initials = computed(() => {
    const u = this.user();
    if (!u) return '';
    return ((u.FirstName?.[0] ?? '') + (u.Surname?.[0] ?? '')).toUpperCase() || u.Username[0].toUpperCase();
  });

  /** Primary company name shown in the sidebar chip (first active company). */
  readonly primaryCompany = computed(() =>
    this.companies().find(c => c.Active)?.CompanyName ?? null
  );

  ngOnInit(): void {
    const uid = this.user()?.user_id;
    if (uid == null) return;
    this.api.getCompaniesByUser(uid).subscribe(c => this.companies.set(c));
  }

  logout(): void { this.auth.logout(); }
}
