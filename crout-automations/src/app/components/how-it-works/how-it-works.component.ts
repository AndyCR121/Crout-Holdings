import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IHowItWorksStep } from '../../interfaces/i-how-it-works-step.interface';

@Component({
  selector: 'ca-how-it-works',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './how-it-works.component.html',
  styleUrl: './how-it-works.component.scss'
})
export class HowItWorksComponent {
  readonly steps: IHowItWorksStep[] = [
    {
      step: 1,
      icon: 'calendar',
      title: 'Book a Free Consultation',
      description: 'We meet (online or in person) to understand your business, your current workflows, and where the time is being lost. No technical knowledge required from your side.'
    },
    {
      step: 2,
      icon: 'map',
      title: 'We Design Your Automation',
      description: 'We map out exactly which automations will have the biggest impact, confirm the tools involved, and send you a clear proposal with pricing and timelines.'
    },
    {
      step: 3,
      icon: 'code',
      title: 'We Build & Test Everything',
      description: 'Our team builds the entire workflow in n8n, trains any AI agents on your business, integrates with your existing tools, and tests end-to-end before go-live.'
    },
    {
      step: 4,
      icon: 'rocket',
      title: 'Go Live — We Maintain It',
      description: 'Your automation goes live. We monitor uptime, handle any changes or adjustments, and keep everything running smoothly. You focus on the work that actually needs you.'
    }
  ];
}
