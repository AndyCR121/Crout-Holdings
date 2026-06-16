import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ca-privacy-policy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.scss'
})
export class PrivacyPolicyComponent {
  @Input() assetsBase: string = 'assets/';

  get logoSrc(): string {
    return `${this.assetsBase}Crout Crest Logo Transparent.png`;
  }
}
