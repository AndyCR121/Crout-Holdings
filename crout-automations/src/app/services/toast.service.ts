import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id:      number;
  type:    ToastType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private  _next  = 0;

  show(message: string, type: ToastType = 'info', duration = 4000): void {
    const id = ++this._next;
    this.toasts.update(t => [...t, { id, type, message }]);
    setTimeout(() => this.dismiss(id), duration);
  }

  success(message: string, duration = 4000): void { this.show(message, 'success', duration); }
  error(message: string,   duration = 5000): void { this.show(message, 'error',   duration); }
  info(message: string,    duration = 4000): void { this.show(message, 'info',    duration); }

  dismiss(id: number): void {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }
}
