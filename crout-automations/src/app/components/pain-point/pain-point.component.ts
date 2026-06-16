import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

@Component({
  selector: 'ca-pain-point',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  templateUrl: './pain-point.component.html',
  styleUrl: './pain-point.component.scss'
})
export class PainPointComponent {
  pains = [
    'Manually copying data between systems every day',
    'Following up leads by hand — hours wasted on emails',
    'Sending invoices and statements one by one',
    'Chasing clients for payments with zero automation',
    'No visibility into which tasks are done or pending',
    'Staff doing copy-paste jobs that a workflow could handle in seconds',
  ];
}
