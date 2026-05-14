import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ch-home-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-hero.component.html',
  styleUrl: './home-hero.component.scss'
})
export class HomeHeroComponent {
  @Input() assetsBase: string = '/assets/';

  get heroBg(): string {
    return `${this.assetsBase}scottish-castle-generated.png`;
  }
}
