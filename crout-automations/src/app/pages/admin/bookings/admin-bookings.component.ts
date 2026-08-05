import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingService, IBookingCalendar } from '../../../services/booking.service';
import { ToastService } from '../../../services/toast.service';

@Component({ selector: 'ca-admin-bookings', standalone: true, imports: [CommonModule, FormsModule, DatePipe], templateUrl: './admin-bookings.component.html', styleUrl: './admin-bookings.component.scss' })
export class AdminBookingsComponent {
  private readonly booking = inject(BookingService); private readonly toast = inject(ToastService);
  readonly calendar = signal<IBookingCalendar>({ bookings: [], blocks: [] }); readonly loading = signal(false);
  start = ''; end = ''; note = '';
  constructor() { this.load(); }
  load(): void { const from = new Date(); const to = new Date(); to.setDate(to.getDate() + 90); this.loading.set(true); this.booking.getAdminCalendar(from.toISOString(), to.toISOString()).subscribe({ next: x => { this.calendar.set(x); this.loading.set(false); }, error: () => { this.loading.set(false); this.toast.error('Could not load the booking calendar.'); } }); }
  addBlock(): void { if (!this.start || !this.end) { this.toast.error('Choose a start and end time.'); return; } this.booking.createBlock(new Date(this.start).toISOString(), new Date(this.end).toISOString(), this.note).subscribe({ next: () => { this.start = ''; this.end = ''; this.note = ''; this.toast.success('Unavailable time added.'); this.load(); }, error: e => this.toast.error(e.error?.error ?? 'Could not save the unavailable time.') }); }
  remove(id: number): void { this.booking.deleteBlock(id).subscribe({ next: () => { this.toast.success('Unavailable time removed.'); this.load(); }, error: () => this.toast.error('Could not remove that unavailable time.') }); }
}
