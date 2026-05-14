import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ch-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss'
})
export class NavComponent {
  @Input() assetsBase: string = '/assets/';
  @Input() homeUrl:    string = '/';
  @Input() contactUrl: string = '/contact-us/';

  menuOpen = false;

  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  closeMenu():  void { this.menuOpen = false; }

  scrollTo(event: Event, id: string): void {
    event.preventDefault();
    this.closeMenu();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  readonly navLinks: { label: string; type: 'scroll' | 'href'; target: string }[] = [
    { label: 'Home',       type: 'href',   target: '/' },
    { label: 'Divisions',  type: 'scroll', target: 'divisions' },
    { label: 'About Us',   type: 'scroll', target: 'who-we-are' },
    { label: 'Contact',    type: 'href',   target: '/contact-us/' },
  ];
}
