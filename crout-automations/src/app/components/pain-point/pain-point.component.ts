import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ca-pain-point',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pain-point.component.html',
  styleUrl: './pain-point.component.scss'
})
export class PainPointComponent {
  readonly pains = [
    'Typing up the same quote manually for the 40th time this month',
    'Chasing invoice payments because no one followed up automatically',
    'A client WhatsApp sitting unanswered while you\'re on-site',
    'Moving job card data from WhatsApp into a spreadsheet by hand',
    'Sending month-end reports that take 3 hours to compile',
    'Forgetting to follow up on a lead because you had no reminder'
  ];
}
