import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'ch-dev-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './dev-nav.component.html',
  styleUrl: './dev-nav.component.scss'
})
export class DevNavComponent {}
