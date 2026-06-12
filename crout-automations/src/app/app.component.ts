import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SeoService } from './services/seo.service';
import { DevNavComponent } from './components/dev-nav/dev-nav.component';
import { AccountButtonComponent } from './components/account-button/account-button.component';
import { ToastComponent } from './components/toast/toast.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'ca-root',
  standalone: true,
  imports: [RouterOutlet, DevNavComponent, AccountButtonComponent, ToastComponent, ConfirmDialogComponent],
  template: `
    <ca-dev-nav />
    <ca-account-button class="app-account-btn" />
    <router-outlet />
    <ca-toast />
    <ca-confirm-dialog />
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
    }
    .app-account-btn {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 10000;
    }
  `]
})
export class AppComponent implements OnInit {
  private readonly seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.init();
  }
}
