import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CtaBannerComponent } from '../../../components/cta-banner/cta-banner.component';
import { ScrollRevealDirective } from '../../../directives/scroll-reveal.directive';

@Component({
  selector: 'ca-whatsapp-agent',
  standalone: true,
  imports: [CommonModule, RouterModule, CtaBannerComponent, ScrollRevealDirective],
  templateUrl: './whatsapp-agent.component.html',
  styleUrl: './whatsapp-agent.component.scss'
})
export class WhatsappAgentComponent {

  subServices = [
    {
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
      title: 'Client Support Agent',
      description: 'An AI agent that answers client questions, handles FAQs, troubleshoots common issues, and escalates complex queries to a human — all via WhatsApp, at any hour.',
      features: ['24/7 automated responses', 'FAQ knowledge base', 'Human escalation logic', 'Conversation history', 'Multi-language support', 'Custom tone & persona']
    },
    {
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
      title: 'Team Notifications',
      description: 'Push structured, real-time updates to your team via WhatsApp when specific events occur — new leads, job completions, payment received, task assignments, and more.',
      features: ['Event-triggered alerts', 'Structured message templates', 'Role-based routing', 'Group & individual delivery', 'Custom trigger logic', 'Instant & scheduled sends']
    },
    {
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.44 2 2 0 0 1 3.57 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.4a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
      title: 'Client Notifications',
      description: 'Keep clients informed at every stage — job started, quote ready, invoice sent, payment confirmed. Automated WhatsApp messages that feel personal and timely.',
      features: ['Job status updates', 'Quote & invoice delivery', 'Payment confirmations', 'Appointment reminders', 'Custom notification flows', 'Read-receipt tracking']
    },
    {
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>`,
      title: 'Quote Gathering & Generation',
      description: 'The agent converses with clients via WhatsApp to collect all the details needed for a quote — then generates and delivers the quote, automatically, in the same chat.',
      features: ['Conversational data capture', 'Dynamic question flows', 'Auto quote generation', 'WhatsApp quote delivery', 'Client approval capture', 'Integrates with quote system']
    },
    {
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
      title: 'Marketing to Client Base',
      description: 'Reach your existing clients directly on WhatsApp with promotions, seasonal offers, service updates, and re-engagement campaigns — with personalisation at scale.',
      features: ['Broadcast campaigns', 'Personalised messaging', 'Segmented client lists', 'Promo & offer flows', 'Re-engagement sequences', 'Delivery & open tracking']
    }
  ];

  steps = [
    { num: '01', title: 'Event Triggers', desc: 'A client message, form submission, payment, or internal event fires the automation.' },
    { num: '02', title: 'AI Processes', desc: 'The agent interprets the message, queries your data, and formulates the right response or action.' },
    { num: '03', title: 'WhatsApp Delivers', desc: 'A branded, contextual message is sent to the client or team member via WhatsApp instantly.' },
    { num: '04', title: 'Loop Closes', desc: 'Replies are captured, follow-up flows triggered, and the conversation history is stored for context.' }
  ];
}
