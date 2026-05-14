import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DevNavComponent } from './components/dev-nav/dev-nav.component';
import { FooterComponent } from './components/footer/footer.component';
import { NavComponent } from './components/nav/nav.component';

@Component({
  selector: 'ch-root',
  standalone: true,
  imports: [RouterOutlet, DevNavComponent, NavComponent, FooterComponent],
  template: `
    <!-- <ch-dev-nav></ch-dev-nav> -->
    <ch-nav></ch-nav>
    <router-outlet></router-outlet>
    <ch-footer></ch-footer>
  `
})
export class AppComponent { }
