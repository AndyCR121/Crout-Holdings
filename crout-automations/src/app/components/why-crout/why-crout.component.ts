import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

@Component({
  selector: 'ca-why-crout',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  templateUrl: './why-crout.component.html',
  styleUrl: './why-crout.component.scss'
})
export class WhyCroutComponent {
  reasons = [
    { title: 'Local Pricing in Rands', body: 'No dollar invoices or currency surprises. Everything is priced in ZAR and built around SA business budgets.', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
    { title: 'n8n — Not Zapier', body: 'We use self-hosted n8n so your data stays in SA, costs stay low, and your workflows have no execution limits.', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
    { title: 'You Own Everything', body: 'All workflows, credentials, and documentation belong to you. No lock-in. No black boxes.', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' },
    { title: '24hr Support Response', body: 'Something breaks at 11pm? We respond within 24 hours — and most issues are fixed the same day.', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' },
    { title: 'No Bloated Retainers', body: 'Pay once to build. Monthly support is optional. Start small, scale when ready.', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>' },
    { title: 'Built by a Developer', body: 'Not a no-code reseller. Custom logic, API integrations, and edge cases handled properly from day one.', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>' },
  ];
}
