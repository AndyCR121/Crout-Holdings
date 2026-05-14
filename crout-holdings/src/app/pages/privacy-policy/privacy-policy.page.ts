import { Component } from '@angular/core';
import { PrivacyPolicyComponent } from '../../components/privacy-policy/privacy-policy.component';

@Component({
  selector: 'ch-privacy-policy-page',
  standalone: true,
  imports: [PrivacyPolicyComponent],
  template: `<ch-privacy-policy></ch-privacy-policy>`
})
export class PrivacyPolicyPageComponent {}
