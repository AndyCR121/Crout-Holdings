import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CtaBannerComponent } from '../../components/cta-banner/cta-banner.component';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';
import { ApiService } from '../../services/api.service';
import { IService } from '../../interfaces/i-service.interface';
import { IServiceDisplay } from '../../interfaces/i-service-display.interface';
import { buildServiceDisplay, sortServicesForDisplay } from '../../utils/service-display';

@Component({
  selector: 'ca-services',
  standalone: true,
  imports: [CommonModule, RouterModule, CtaBannerComponent, ScrollRevealDirective, SafeHtmlPipe],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss'
})
export class ServicesComponent implements OnInit {

  private api = inject(ApiService);

  ghostLoaderOnLoad = signal<boolean>(true);

  services: IServiceDisplay[] = [];

  /** Ghost skeletons — 4 cards matching expected service count */
  skeletonCards = Array(4).fill(null);

  ngOnInit(): void {
    this.onLoad();
  }

  async onLoad(): Promise<void> {
    try {
      const resp = await this.api.getServices().toPromise();
      if (resp) {
        this.services = sortServicesForDisplay(resp)
          .filter(s => !s.conditional)
          .map((s, i) => buildServiceDisplay(s, i));
        this.ghostLoaderOnLoad.set(false);
      }
    } catch (error: any) {
      console.error(
        error ? (error.message ?? error.error ?? error) : 'Something went wrong onLoad()!'
      );
      this.ghostLoaderOnLoad.set(false);
    }
  }
}
