import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { APP_VERSION } from '../../app-version';
import { ReleaseNotesDialogComponent } from '../release-notes-dialog/release-notes-dialog.component';

@Component({
  selector: 'ca-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, MatDialogModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  private readonly dialog = inject(MatDialog);
  currentYear = new Date().getFullYear();
  readonly version = APP_VERSION;
  @Input() assetsBase: string = '/assets/';

  services = [
    { label: 'Lead Capture & CRM Sync',      route: '/services' },
    { label: 'Invoice & Payment Workflows',   route: '/services' },
    { label: 'Client Onboarding',             route: '/services' },
    { label: 'Reporting & Dashboards',        route: '/services' },
    { label: 'Internal Notifications & Alerts', route: '/services' },
    { label: 'AI Agent Workflows',            route: '/services' },
  ];

  navLinks = [
    { label: 'Home',       route: '/' },
    { label: 'Services',   route: '/services' },
    { label: 'Contact Us', route: '/contact-us' },
  ];

  openReleaseNotes(): void {
    this.dialog.open(ReleaseNotesDialogComponent, {
      width: '880px',
      maxWidth: '95vw',
      panelClass: 'ca-release-notes-overlay'
    });
  }
}
