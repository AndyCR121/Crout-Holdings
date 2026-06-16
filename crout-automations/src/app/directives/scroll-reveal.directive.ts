import {
  Directive,
  ElementRef,
  Input,
  AfterViewInit,
  OnDestroy,
  NgZone,
} from '@angular/core';

@Directive({
  selector: '[caScrollReveal]',
  standalone: true,
})
export class ScrollRevealDirective implements AfterViewInit, OnDestroy {
  /** When true, staggers direct children instead of animating the host element */
  @Input() staggerChildren = false;

  /** Base delay in ms before the first child animates */
  @Input() revealDelay = 0;

  private observer!: IntersectionObserver;
  private targets: HTMLElement[] = [];

  constructor(private el: ElementRef<HTMLElement>, private zone: NgZone) {}

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      // Collect the elements to animate
      if (this.staggerChildren) {
        this.targets = Array.from(
          this.el.nativeElement.children
        ) as HTMLElement[];
      } else {
        this.targets = [this.el.nativeElement];
      }

      // Mark targets as hidden before the observer fires
      this.targets.forEach((el, i) => {
        el.classList.add('reveal');
        if (this.staggerChildren) {
          el.style.setProperty('--stagger-i', String(i));
        }
        if (this.revealDelay) {
          el.style.setProperty('--reveal-delay', `${this.revealDelay}ms`);
        }
      });

      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-revealed');
              // Unobserve after reveal — animate once only
              this.observer.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.12,
          rootMargin: '0px 0px -48px 0px',
        }
      );

      this.targets.forEach((t) => this.observer.observe(t));
    });
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.targets.forEach((t) => this.observer.unobserve(t));
      this.observer.disconnect();
    }
  }
}
