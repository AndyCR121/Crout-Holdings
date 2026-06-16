import { Component } from '@angular/core';

@Component({
  selector: 'ch-not-found',
  standalone: true,
  template: `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;font-family:sans-serif;">
      <h1 style="font-size:4rem;margin:0;">404</h1>
      <p style="color:#666;">Page not found.</p>
    </div>
  `
})
export class NotFoundComponent {}
