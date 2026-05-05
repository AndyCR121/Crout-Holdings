import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IPricingTier } from '../../interfaces/i-pricing-tier.interface';

@Component({
  selector: 'ca-pricing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss'
})
export class PricingComponent {
  readonly tiers: IPricingTier[] = [
    {
      id: 'standard',
      name: 'Standard Automation',
      setupFee: 2000,
      monthlyFrom: 4000,
      description: 'Ideal for straightforward workflow automations with no AI agent required. Clean integrations, fast setup, immediate results.',
      features: [
        'Custom n8n workflow automation',
        'Integration with your existing tools',
        'No AI agent required',
        'Full technical setup & testing',
        '24/7 automation uptime',
        '24hr support included',
        'Unlimited changes & adjustments'
      ],
      highlight: false
    },
    {
      id: 'ai-agent',
      name: 'AI Agent Package',
      setupFee: 2000,
      monthlyFrom: 6000,
      description: 'Includes a fully trained AI agent (WhatsApp, receptionist, or custom) integrated into your business workflow. The most popular package.',
      features: [
        'Everything in Standard',
        'Custom AI Agent (WhatsApp or voice)',
        'Business knowledge base integration',
        'Real-time client interaction',
        'Upgradeable to multi-function agent',
        'Agent triggers other automations',
        'Priority support'
      ],
      highlight: true,
      badge: 'Most Popular'
    },
    {
      id: 'enterprise',
      name: 'Enterprise \/Complex',
      setupFee: 2000,
      monthlyFrom: 8000,
      description: 'For high-intensity workflows, complex multi-system integrations, or high token/execution requirements. Custom scoped to your operation.',
      features: [
        'Everything in AI Agent',
        'High-volume execution support',
        'Multi-system cross-platform workflows',
        'Complex logic & branching flows',
        'Custom development if required',
        'Dedicated setup consultation',
        'Tailored SLA agreement'
      ],
      highlight: false
    }
  ];
}
