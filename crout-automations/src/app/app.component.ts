import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'ca-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
  styles: []
})
export class AppComponent {}
