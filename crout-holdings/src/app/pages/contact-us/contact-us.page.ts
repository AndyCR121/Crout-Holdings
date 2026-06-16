import { Component } from '@angular/core';
import { ContactUsComponent } from '../../components/contact-us/contact-us.component';

@Component({
  selector: 'ch-contact-us-page',
  standalone: true,
  imports: [ContactUsComponent],
  template: `<ch-contact-us></ch-contact-us>`
})
export class ContactUsPageComponent {}
