import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollService } from '../../services/scroll.service';

@Component({
  selector: 'ch-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss',
  providers: [ScrollService]
})
export class NavComponent implements OnInit {
  @Input() assetsBase: string = '/assets/';
  @Input() homeUrl:    string = '/';
  @Input() contactUrl: string = '/contact-us/';

  menuOpen = false;

  constructor(private scrollSvc: ScrollService) {}

  ngOnInit(): void {
    // If we landed here via a ?scrollTo= redirect, handle it
    this.scrollSvc.handleScrollParam();
  }

  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  closeMenu():  void { this.menuOpen = false; }

  scrollTo(event: Event, id: string): void {
    event.preventDefault();
    this.closeMenu();
    this.scrollSvc.scrollTo(id, this.homeUrl);
  }

  readonly navLinks: { label: string; type: 'scroll' | 'href'; target: string }[] = [
    { label: 'Home',      type: 'href',   target: '/' },
    { label: 'Divisions', type: 'scroll', target: 'divisions' },
    { label: 'About Us',  type: 'scroll', target: 'who-we-are' },
    { label: 'Contact',   type: 'href',   target: '/contact-us/' },
  ];
}
