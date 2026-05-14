import { Component, Input, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ch-home-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-hero.component.html',
  styleUrl: './home-hero.component.scss'
})
export class HomeHeroComponent implements OnInit, OnDestroy {
  @Input() assetsBase: string = '/assets/';

  get heroBg(): string {
    return `${this.assetsBase}scottish-castle-generated.png`;
  }

  private heroEl!: HTMLElement;
  private rafId: number | null = null;
  private isMobile = false;

  constructor(private elRef: ElementRef) { }

  ngOnInit(): void {
    this.isMobile = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    if (this.isMobile) {
      this.heroEl = this.elRef.nativeElement.querySelector('.hero');
      window.addEventListener('scroll', this.onScroll, { passive: true });
    }
  }

  ngOnDestroy(): void {
    if (this.isMobile) {
      window.removeEventListener('scroll', this.onScroll);
    }
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  private onScroll = (): void => {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (!this.heroEl) return;
      const offset = window.scrollY * 0.35;
      this.heroEl.style.setProperty('--parallax-offset', `${offset}px`);
    });
  };
}
