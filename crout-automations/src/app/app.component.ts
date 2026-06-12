import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { SeoService } from './services/seo.service';
import { DevNavComponent } from './components/dev-nav/dev-nav.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ToastComponent } from './components/toast/toast.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'ca-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, DevNavComponent, NavbarComponent, ToastComponent, ConfirmDialogComponent],
  template: `
    <ca-dev-nav />
    <ca-navbar *ngIf="showNavbar" />
    <router-outlet />
    <ca-toast />
    <ca-confirm-dialog />
  `,
  styles: [`:host { display: block; position: relative; }`]
})
export class AppComponent implements OnInit {
  private readonly seo    = inject(SeoService);
  private readonly router = inject(Router);

  showNavbar = true;

  ngOnInit(): void {
    this.seo.init();
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.showNavbar = !e.urlAfterRedirects.startsWith('/admin');
      });
  }
}
