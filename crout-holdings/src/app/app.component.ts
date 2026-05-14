import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DevNavComponent } from './components/dev-nav/dev-nav.component';

@Component({
  selector: 'ch-root',
  standalone: true,
  imports: [RouterOutlet, DevNavComponent],
  template: `
    <ch-dev-nav></ch-dev-nav>
    <router-outlet></router-outlet>
  `
})
export class AppComponent {}
