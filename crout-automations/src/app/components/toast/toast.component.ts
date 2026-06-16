import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../services/toast.service';

@Component({
  selector: 'ca-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ca-toast-stack" aria-live="polite" aria-atomic="false">
      @for (t of toast.toasts(); track t.id) {
        <div class="ca-toast" [class]="'ca-toast--' + t.type" role="alert">
          <span class="ca-toast-icon">
            @if (t.type === 'success') {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            } @else if (t.type === 'error') {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            } @else {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            }
          </span>
          <span class="ca-toast-msg">{{ t.message }}</span>
          <button class="ca-toast-close" (click)="toast.dismiss(t.id)" aria-label="Dismiss">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .ca-toast-stack {
      position:       fixed;
      bottom:         1.5rem;
      right:          1.5rem;
      z-index:        99999;
      display:        flex;
      flex-direction: column;
      gap:            0.5rem;
      pointer-events: none;
      max-width:      360px;
      width:          calc(100vw - 2rem);
    }

    .ca-toast {
      display:        flex;
      align-items:    center;
      gap:            0.6rem;
      padding:        0.65rem 0.85rem;
      border-radius:  10px;
      font-size:      13.5px;
      font-weight:    500;
      pointer-events: all;
      box-shadow:     0 4px 20px rgba(0,0,0,0.35);
      animation:      ca-toast-in 220ms cubic-bezier(0.16,1,0.3,1) both;
      line-height:    1.4;
      border:         1px solid transparent;
    }

    @keyframes ca-toast-in {
      from { opacity: 0; transform: translateY(10px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0)    scale(1);    }
    }

    .ca-toast--success {
      background: #163b23;
      border-color: rgba(80,200,120,0.25);
      color: #6ee89a;
    }
    .ca-toast--error {
      background: #3b1215;
      border-color: rgba(240,80,80,0.25);
      color: #f47a7a;
    }
    .ca-toast--info {
      background: #0e2040;
      border-color: rgba(100,160,255,0.25);
      color: #7aaeff;
    }

    .ca-toast-icon { flex-shrink: 0; display: flex; align-items: center; }
    .ca-toast-msg  { flex: 1; }

    .ca-toast-close {
      flex-shrink:  0;
      display:      flex;
      align-items:  center;
      background:   transparent;
      border:       none;
      cursor:       pointer;
      color:        inherit;
      opacity:      0.55;
      padding:      2px;
      border-radius: 4px;
      transition:   opacity 140ms ease;
      &:hover { opacity: 1; }
    }
  `]
})
export class ToastComponent {
  readonly toast = inject(ToastService);
}
