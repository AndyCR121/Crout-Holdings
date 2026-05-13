import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SeoService } from './services/seo.service';
import { DevNavComponent } from './components/dev-nav/dev-nav.component';

@Component({
  selector: 'ca-root',
  standalone: true,
  imports: [RouterOutlet, DevNavComponent],
  template: `
    <ca-dev-nav />
    <router-outlet />
  `
})
export class AppComponent implements OnInit {
  private readonly seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.init();
  }
}
