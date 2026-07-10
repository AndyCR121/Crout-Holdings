import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { APP_VERSION } from '../../app-version';
import { ReleaseNotesDialogComponent } from '../release-notes-dialog/release-notes-dialog.component';
import { ApiService } from '../../services/api.service';
import { serviceLabel, serviceRoute, sortServicesForDisplay } from '../../utils/service-display';

@Component({
  selector: 'ca-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, MatDialogModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly api = inject(ApiService);
  currentYear = new Date().getFullYear();
  readonly version = APP_VERSION;
  @Input() assetsBase: string = '/assets/';
  readonly services = signal<{ label: string; route: string }[]>([]);

  readonly navLinks = [
    { label: 'Home',       route: '/' },
    { label: 'Services',   route: '/services' },
    { label: 'Contact Us', route: '/contact-us' },
  ];

  ngOnInit(): void {
    this.api.getServices().subscribe({
      next: services => {
        this.services.set(
          sortServicesForDisplay(services)
            .filter(service => !service.conditional)
            .slice(0, 6)
            .map(service => ({
              label: serviceLabel(service),
              route: serviceRoute(service),
            }))
        );
      },
      error: () => this.services.set([]),
    });
  }

  openReleaseNotes(): void {
    this.dialog.open(ReleaseNotesDialogComponent, {
      width: '880px',
      maxWidth: '95vw',
      panelClass: 'ca-release-notes-overlay'
    });
  }
}
