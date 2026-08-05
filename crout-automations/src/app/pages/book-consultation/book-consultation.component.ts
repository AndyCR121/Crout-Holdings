import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { BookingService, IBooking, IBookingAvailabilitySettings, IBookingCalendar } from '../../services/booking.service';
import { AuthModalComponent } from '../../components/auth-modal/auth-modal.component';
import { ToastService } from '../../services/toast.service';

@Component({ selector: 'ca-book-consultation', standalone: true, imports: [CommonModule, FormsModule, DatePipe, AuthModalComponent], templateUrl: './book-consultation.component.html', styleUrl: './book-consultation.component.scss' })
export class BookConsultationComponent {
  private readonly bookings = inject(BookingService); private readonly auth = inject(AuthService); private readonly toast = inject(ToastService);
  readonly loggedIn = computed(() => this.auth.isLoggedIn()); readonly user = computed(() => this.auth.currentUser());
  readonly bookingId = input<number | null>(null);
  readonly booked = output<IBooking>();
  readonly calendar = signal<IBookingCalendar>({ bookings: [], blocks: [] }); readonly selectedDate = signal(this.dateKey(new Date()));
  readonly availability = signal<IBookingAvailabilitySettings>({ availabilityStart: '08:00', availabilityEnd: '16:00', availableDays: '1,2,3,4,5', consultationPlatforms: 'Teams,Slack,Discord' });
  selectedSlot = ''; selectedPlatform = '';
  readonly loading = signal(false); readonly showAuth = signal(false); readonly submitting = signal(false); readonly confirmation = signal<string | null>(null);
  readonly days = computed(() => Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; }).filter(d => this.availableDays().includes(d.getDay())));
  readonly slots = computed(() => { const day = this.selectedDate(); const [startHour, startMinute] = this.availability().availabilityStart.split(':').map(Number); const [endHour, endMinute] = this.availability().availabilityEnd.split(':').map(Number); const starts = startHour * 60 + startMinute; const ends = endHour * 60 + endMinute; return Array.from({ length: Math.max(0, Math.floor((ends - starts) / 30)) }, (_, i) => { const minutes = starts + i * 30; const label = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; const start = new Date(`${day}T${label}:00+02:00`).toISOString(); const end = new Date(new Date(start).getTime() + 30 * 60000).toISOString(); return { start, end, label, occupied: this.isOccupied(start, end) }; }); });
  constructor() { this.load(); this.bookings.getAvailabilitySettings().subscribe({ next: settings => { this.availability.set(settings); if (!this.availableDays().includes(new Date().getDay()) && this.days().length) this.selectedDate.set(this.dateKey(this.days()[0])); }, error: () => this.toast.error('Could not load consultation hours.') }); }
  selectDay(day: Date): void { this.selectedDate.set(this.dateKey(day)); this.selectedSlot = ''; this.confirmation.set(null); }
  load(): void { this.loading.set(true); const from = new Date(); const to = new Date(); to.setDate(to.getDate() + 15); this.bookings.getCalendar(from.toISOString(), to.toISOString()).subscribe({ next: c => { this.calendar.set(c); this.loading.set(false); }, error: () => { this.loading.set(false); this.toast.error('Could not load appointment availability.'); } }); }
  bookSelected(): void { if (!this.selectedSlot || !this.selectedPlatform) { this.toast.error('Choose a consultation time and platform.'); return; } this.book(this.selectedSlot); }
  book(startsAt: string): void { if (!this.loggedIn()) { this.showAuth.set(true); return; } this.submitting.set(true); const save = this.bookingId() == null ? this.bookings.create(startsAt, this.selectedPlatform) : this.bookings.reschedule(this.bookingId()!, startsAt, this.selectedPlatform); save.subscribe({ next: booking => { this.submitting.set(false); this.confirmation.set(booking.startsAt); this.booked.emit(booking); this.toast.success(this.bookingId() == null ? 'Your consultation is confirmed. A confirmation email is on its way.' : 'Your consultation has been updated.'); this.load(); }, error: e => { this.submitting.set(false); this.toast.error(e.error?.error ?? 'That time is no longer available.'); this.load(); } }); }
  closeAuth(): void { this.showAuth.set(false); }
  isOccupied(start: string, end: string): boolean { return [...this.calendar().bookings, ...this.calendar().blocks].some((entry: any) => entry.startsAt < end && entry.endsAt > start); }
  isMine(start: string): boolean { return this.calendar().bookings.some(b => b.startsAt === start && b.userId === this.user()?.userId); }
  dateKey(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  private availableDays(): number[] { return this.availability().availableDays.split(',').map(Number); }
  platforms(): string[] { return this.availability().consultationPlatforms.split(',').map(platform => platform.trim()).filter(Boolean); }
}
