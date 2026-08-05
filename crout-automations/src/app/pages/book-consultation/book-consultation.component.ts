import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { BookingService, IBookingCalendar } from '../../services/booking.service';
import { AuthModalComponent } from '../../components/auth-modal/auth-modal.component';
import { ToastService } from '../../services/toast.service';

@Component({ selector: 'ca-book-consultation', standalone: true, imports: [CommonModule, FormsModule, DatePipe, AuthModalComponent], templateUrl: './book-consultation.component.html', styleUrl: './book-consultation.component.scss' })
export class BookConsultationComponent {
  private readonly bookings = inject(BookingService); private readonly auth = inject(AuthService); private readonly toast = inject(ToastService);
  readonly loggedIn = computed(() => this.auth.isLoggedIn()); readonly user = computed(() => this.auth.currentUser());
  readonly calendar = signal<IBookingCalendar>({ bookings: [], blocks: [] }); readonly selectedDate = signal(this.dateKey(new Date()));
  readonly loading = signal(false); readonly showAuth = signal(false); readonly submitting = signal(false); readonly confirmation = signal<string | null>(null);
  readonly days = computed(() => Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; }).filter(d => d.getDay() !== 0 && d.getDay() !== 6));
  readonly slots = computed(() => { const day = this.selectedDate(); return Array.from({ length: 16 }, (_, i) => { const h = 8 + Math.floor(i / 2); const minute = i % 2 ? 30 : 0; const start = `${day}T${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`; const end = new Date(new Date(start).getTime() + 30 * 60000).toISOString(); return { start, end, label: `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}` }; }).filter(slot => !this.isOccupied(slot.start, slot.end)); });
  constructor() { this.load(); }
  selectDay(day: Date): void { this.selectedDate.set(this.dateKey(day)); this.confirmation.set(null); }
  load(): void { this.loading.set(true); const from = new Date(); const to = new Date(); to.setDate(to.getDate() + 15); this.bookings.getCalendar(from.toISOString(), to.toISOString()).subscribe({ next: c => { this.calendar.set(c); this.loading.set(false); }, error: () => { this.loading.set(false); this.toast.error('Could not load appointment availability.'); } }); }
  book(startsAt: string): void { if (!this.loggedIn()) { this.showAuth.set(true); return; } this.submitting.set(true); this.bookings.create(startsAt).subscribe({ next: booking => { this.submitting.set(false); this.confirmation.set(booking.startsAt); this.toast.success('Your consultation is confirmed. A confirmation email is on its way.'); this.load(); }, error: e => { this.submitting.set(false); this.toast.error(e.error?.error ?? 'That time is no longer available.'); this.load(); } }); }
  closeAuth(): void { this.showAuth.set(false); }
  isOccupied(start: string, end: string): boolean { return [...this.calendar().bookings, ...this.calendar().blocks].some((entry: any) => entry.startsAt < end && entry.endsAt > start); }
  isMine(start: string): boolean { return this.calendar().bookings.some(b => b.startsAt === start && b.userId === this.user()?.userId); }
  private dateKey(date: Date): string { return date.toISOString().slice(0, 10); }
}
