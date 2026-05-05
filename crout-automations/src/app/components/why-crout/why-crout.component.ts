import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IWhyFeature } from '../../interfaces/i-why-feature.interface';

@Component({
  selector: 'ca-why-crout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './why-crout.component.html',
  styleUrl: './why-crout.component.scss'
})
export class WhyCroutComponent {
  readonly features: IWhyFeature[] = [
    {
      icon: 'clock',
      title: '24/7 — No Days Off',
      description: 'Your automations run every hour of every day, including weekends and public holidays. While you sleep, your business is already handling quotes, responding to clients, and processing job cards.'
    },
    {
      icon: 'plug',
      title: 'Built Into Your Tools',
      description: 'We integrate with what you already use — Xero, WhatsApp, Trello, and hundreds of other platforms via n8n. No switching systems. No migration nightmares.'
    },
    {
      icon: 'support',
      title: '24hr Support, Always',
      description: "Got an issue at 9pm on a Friday? We're available. Our 24-hour support means you're never left with a broken workflow."
    },
    {
      icon: 'wrench',
      title: 'Changes at No Extra Cost',
      description: 'Business evolves. So do your automations. Adjustments, upgrades, and changes are all included in your subscription.'
    },
    {
      icon: 'shield',
      title: 'Zero Experience Required',
      description: "You don't need to understand how n8n, Xero APIs, or AI agents work. We handle every technical aspect — from initial setup to ongoing maintenance."
    },
    {
      icon: 'globe',
      title: 'South African, Globally Ready',
      description: 'We understand the local business landscape — ZAR pricing, local compliance, and SA business hours. Built here, scalable globally when you\'re ready.'
    }
  ];
}
