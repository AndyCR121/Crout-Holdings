import { Injectable, signal } from '@angular/core';

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel: string;
  resolve: (confirmed: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  readonly state = signal<ConfirmDialogState | null>(null);

  open(title: string, message: string, confirmLabel = 'Delete'): Promise<boolean> {
    return new Promise(resolve => {
      this.state.set({ title, message, confirmLabel, resolve });
    });
  }

  confirm(): void {
    this.state()?.resolve(true);
    this.state.set(null);
  }

  cancel(): void {
    this.state()?.resolve(false);
    this.state.set(null);
  }
}
