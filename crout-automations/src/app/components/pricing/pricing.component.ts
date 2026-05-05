import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

@Component({
  selector: 'ca-pricing',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss'
})
export class PricingComponent {
  plans = [
    {
      name: 'Starter',
      price: '2,000',
      period: 'once-off',
      desc: 'One automation workflow. Perfect for testing what automation can do for your business.',
      featured: false,
      features: [
        '1 custom workflow',
        'Up to 3 integrations',
        'Full documentation',
        '30-day support included',
        'You own the workflow',
      ],
      cta: { label: 'Get Started', href: '/contact-us/' }
    },
    {
      name: 'Growth',
      price: '5,500',
      period: 'once-off',
      desc: 'Your full automation stack. Multiple workflows, AI agents, and a month of support included free.',
      featured: true,
      features: [
        'Up to 5 custom workflows',
        'Unlimited integrations',
        'AI agent setup (GPT)',
        '1st month support free',
        'Priority build turnaround',
        'Full documentation',
      ],
      cta: { label: 'Book a Consultation', href: '/contact-us/' }
    },
    {
      name: 'Retainer',
      price: '1,200',
      period: '/month',
      desc: 'Ongoing maintenance, monitoring, and new automations as your business grows.',
      featured: false,
      features: [
        'Unlimited workflow updates',
        'New automations monthly',
        '24hr support response',
        'Monthly performance report',
        'Cancel anytime',
      ],
      cta: { label: 'Add to Any Plan', href: '/contact-us/' }
    }
  ];
}
