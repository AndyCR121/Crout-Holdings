import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ch-what-we-do',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './what-we-do.component.html',
  styleUrl: './what-we-do.component.scss'
})
export class WhatWeDoComponent {
  /** WordPress: pass full URL to the divisions page */
  @Input() divisionsUrl: string = '/divisions';
}
