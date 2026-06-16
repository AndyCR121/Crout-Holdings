import { Component } from '@angular/core';
import { PrivacyPolicyComponent } from '../../components/privacy-policy/privacy-policy.component';

@Component({
  selector: 'ca-page-privacy-policy',
  standalone: true,
  imports: [PrivacyPolicyComponent],
  template: `<ca-privacy-policy></ca-privacy-policy>`
})
export class PrivacyPolicyPageComponent {}
