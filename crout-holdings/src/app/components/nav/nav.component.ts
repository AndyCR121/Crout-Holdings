import { Component, Input, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ch-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss'
})
export class NavComponent implements OnInit {
  @Input() assetsBase: string = '';
  @Input() homeUrl:    string = '/';
  @Input() contactUrl: string = '/contact-us/';

  scrolled    = false;
  menuOpen    = false;

  ngOnInit(): void {}

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled = window.scrollY > 40;
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  readonly navLinks = [
    { label: 'Home',        href: '/' },
    { label: 'Divisions',   href: '/divisions/' },
    { label: 'About',       href: '/about/' },
    { label: 'Contact',     href: '/contact-us/' },
  ];
}
