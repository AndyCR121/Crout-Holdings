import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'ca-dev-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './dev-nav.component.html',
  styleUrl: './dev-nav.component.scss'
})
export class DevNavComponent {
  readonly isDev = !environment.production;
}
