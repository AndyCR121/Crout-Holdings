import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollService } from '../../services/scroll.service';

export interface FooterLink {
  label: string;
  /** 'href' navigates directly; 'scroll' calls scrollTo(); 'external' opens in new tab */
  type:  'href' | 'scroll' | 'external';
  target: string;
}

@Component({
  selector: 'ch-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  providers: [ScrollService]
})
export class FooterComponent implements OnInit {
  @Input() assetsBase:  string = '/assets/';
  @Input() contactUrl:  string = '/contact-us/';
  @Input() homeUrl:     string = '/';

  readonly currentYear = new Date().getFullYear();

  constructor(private scrollSvc: ScrollService) {}

  ngOnInit(): void {
    this.scrollSvc.handleScrollParam();
  }

  onLinkClick(event: Event, link: FooterLink): void {
    if (link.type !== 'scroll') return;
    event.preventDefault();
    this.scrollSvc.scrollTo(link.target, this.homeUrl);
  }

  /**
   * Divisions column.
   * Automations is live → external link.
   * All others are not yet available → scroll to #divisions on the home page.
   */
  readonly divisions: FooterLink[] = [
    { label: 'Automations', type: 'external', target: 'https://automations.crout-holdings.com/' },
    { label: 'Security',    type: 'scroll',   target: 'divisions' },
    { label: 'Properties',  type: 'scroll',   target: 'divisions' },
    { label: 'Auto',        type: 'scroll',   target: 'divisions' },
    { label: 'SaaS',        type: 'scroll',   target: 'divisions' },
  ];

  /** Company column. */
  readonly company: FooterLink[] = [
    { label: 'About Us',      type: 'scroll', target: 'who-we-are' },
    { label: 'Contact',       type: 'href',   target: '/contact-us/' },
    { label: 'Privacy Policy', type: 'href',  target: '/privacy-policy/' },
  ];
}
