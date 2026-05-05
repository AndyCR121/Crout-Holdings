import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IServiceCard } from '../../interfaces/i-service-card.interface';

@Component({
  selector: 'ca-services-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './services-overview.component.html',
  styleUrl: './services-overview.component.scss'
})
export class ServicesOverviewComponent {
  readonly services: IServiceCard[] = [
    {
      id: 'whatsapp-agent',
      icon: 'message',
      title: 'WhatsApp AI Agent',
      description: 'A trained AI agent that lives in your WhatsApp Business account. It reads incoming messages, understands context, and responds — 24/7, without you lifting a finger.',
      features: ['Instant client responses', 'Handles FAQs & quotes', 'Escalates when needed', 'Fully trained on your business'],
      badge: 'Most Popular'
    },
    {
      id: 'quoting-invoicing',
      icon: 'file',
      title: 'Quoting & Invoicing',
      description: 'From trigger to sent — your quoting and invoicing workflow runs automatically. Connected to Xero, triggered by your job cards, and delivered before the client even asks.',
      features: ['Auto-generate quotes', 'Xero integration', 'Payment reminders', 'Job card triggers'],
      badge: undefined
    },
    {
      id: 'job-cards',
      icon: 'clipboard',
      title: 'Job Card Automation',
      description: 'Stop copying data between WhatsApp, spreadsheets, and your project tool. We automate the full job card lifecycle — creation, assignment, status updates, and completion.',
      features: ['WhatsApp → Trello/Sheets', 'Auto-assign to technicians', 'Status notifications', 'Completion tracking'],
      badge: undefined
    },
    {
      id: 'custom',
      icon: 'wrench',
      title: 'Custom Workflows',
      description: 'If your business has a repetitive process that involves moving data, sending messages, or updating systems — we can automate it. No process is too niche.',
      features: ['Any platform, any trigger', 'Multi-step logic flows', 'API integrations', 'Fully bespoke'],
      badge: 'Flexible'
    }
  ];
}
