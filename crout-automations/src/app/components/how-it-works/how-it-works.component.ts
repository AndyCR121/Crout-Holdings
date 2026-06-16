import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

@Component({
  selector: 'ca-how-it-works',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  templateUrl: './how-it-works.component.html',
  styleUrl: './how-it-works.component.scss'
})
export class HowItWorksComponent {
  steps = [
    { number: '01', title: 'Discovery Call', copy: 'We spend 30 minutes understanding your biggest time-wasters and the tools you already use.' },
    { number: '02', title: 'Workflow Design', copy: 'We map out the automation logic, integrations, and triggers — you approve before we build anything.' },
    { number: '03', title: 'Build & Test', copy: 'Your workflow is built in n8n, connected to your real systems, and stress-tested before it goes live.' },
    { number: '04', title: 'Go Live', copy: 'We deploy, monitor the first run with you, and hand over full documentation so you understand exactly what runs and when.' },
    { number: '05', title: 'Ongoing Support', copy: 'Monthly retainer includes maintenance, updates, and adding new automations as your business grows.' },
  ];
}
