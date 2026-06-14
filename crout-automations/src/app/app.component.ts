import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { SeoService } from './services/seo.service';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { ToastComponent } from './components/toast/toast.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { AccountButtonComponent } from './components/account-button/account-button.component';

@Component({
  selector: 'ca-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, FooterComponent, ToastComponent, ConfirmDialogComponent, AccountButtonComponent],
  template: `
    <ca-navbar *ngIf="showNavbar" />
    <ca-account-button class="ca-account-fixed" />
    <router-outlet />
    <ca-footer *ngIf="showNavbar" />
    <ca-toast />
    <ca-confirm-dialog />
  `,
  styles: [`
    :host { display: block; position: relative; }

    .ca-account-fixed {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 1000;
    }
  `]
})
export class AppComponent implements OnInit {
  private readonly seo    = inject(SeoService);
  private readonly router = inject(Router);

  // ca-navbar & ca-footer are hidden on portal & admin routes —
  // both have their own left-menu navigation.
  showNavbar = true;

  ngOnInit(): void {
    this.seo.init();
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const url: string = e.urlAfterRedirects;
        this.showNavbar = !url.startsWith('/admin') && !url.startsWith('/client');
      });
  }
}
