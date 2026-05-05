import {
  Directive, ElementRef, Input, OnInit, OnDestroy, inject, PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * [caScrollReveal] — IntersectionObserver-based scroll reveal.
 *
 * Usage:
 *   <div caScrollReveal>...</div>
 *   <div caScrollReveal [revealDelay]="200">...</div>        <!-- 200ms delay -->
 *   <ul caScrollReveal [staggerChildren]="true">...</ul>     <!-- staggers direct children -->
 *
 * The directive adds .is-revealed when the element enters the viewport.
 * Animation is defined entirely in CSS (_base.scss) so it respects prefers-reduced-motion.
 */
@Directive({
  selector: '[caScrollReveal]',
  standalone: true
})
export class ScrollRevealDirective implements OnInit, OnDestroy {
  @Input() revealDelay    = 0;     // ms offset before reveal
  @Input() revealThreshold = 0.15; // 0–1: how much of the element must be visible
  @Input() staggerChildren = false; // apply stagger-delay to direct children

  private readonly el         = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private observer!: IntersectionObserver;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Respect prefers-reduced-motion — mark immediately, skip animation
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.reveal(this.el.nativeElement);
      return;
    }

    const host = this.el.nativeElement;
    host.classList.add('reveal');

    if (this.staggerChildren) {
      Array.from(host.children).forEach((child, i) => {
        (child as HTMLElement).style.setProperty('--stagger-i', String(i));
        (child as HTMLElement).classList.add('reveal-child');
      });
    }

    this.observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setTimeout(() => this.reveal(entry.target as HTMLElement), this.revealDelay);
            this.observer.unobserve(entry.target);
          }
        });
      },
      { threshold: this.revealThreshold, rootMargin: '0px 0px -48px 0px' }
    );

    this.observer.observe(host);
  }

  private reveal(el: HTMLElement): void {
    el.classList.add('is-revealed');
    if (this.staggerChildren) {
      Array.from(el.children).forEach(child =>
        (child as HTMLElement).classList.add('is-revealed')
      );
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
