import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EnvironmentService } from './environment.service';

export interface IBooking { bookingId: number; userId: number; clientName: string; clientEmail: string; startsAt: string; endsAt: string; platform: string; status: string; }
export interface IAvailabilityBlock { availabilityBlockId: number; startsAt: string; endsAt: string; note?: string; }
export interface IBookingCalendar { bookings: IBooking[]; blocks: IAvailabilityBlock[]; }
export interface IBookingCalendarSettings { provider: 'google' | 'outlook'; calendarEmail: string; availabilityStart: string; availabilityEnd: string; availableDays: string; consultationPlatforms: string; updatedAt?: string; }
export interface IBookingAvailabilitySettings { availabilityStart: string; availabilityEnd: string; availableDays: string; consultationPlatforms: string; }

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvironmentService);
  private get base(): string { return this.env.apiUrl; }
  getCalendar(from: string, to: string): Observable<IBookingCalendar> { return this.http.get<IBookingCalendar>(`${this.base}/bookings/calendar`, { params: { from, to } }); }
  getAvailabilitySettings(): Observable<IBookingAvailabilitySettings> { return this.http.get<IBookingAvailabilitySettings>(`${this.base}/bookings/availability-settings`); }
  getAdminCalendar(from: string, to: string): Observable<IBookingCalendar> { return this.http.get<IBookingCalendar>(`${this.base}/bookings/calendar/admin`, { params: { from, to }, withCredentials: true }); }
  create(startsAt: string, platform: string): Observable<IBooking> { return this.http.post<IBooking>(`${this.base}/bookings`, { startsAt, platform }, { withCredentials: true }); }
  reschedule(bookingId: number, startsAt: string, platform: string): Observable<IBooking> { return this.http.put<IBooking>(`${this.base}/bookings/${bookingId}`, { startsAt, platform }, { withCredentials: true }); }
  createBlock(startsAt: string, endsAt: string, note: string): Observable<IAvailabilityBlock> { return this.http.post<IAvailabilityBlock>(`${this.base}/bookings/availability-blocks`, { startsAt, endsAt, note }, { withCredentials: true }); }
  deleteBlock(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/bookings/availability-blocks/${id}`, { withCredentials: true }); }
  getCalendarSettings(): Observable<IBookingCalendarSettings | null> { return this.http.get<IBookingCalendarSettings | null>(`${this.base}/admin/booking-calendar-settings`, { withCredentials: true }); }
  updateCalendarSettings(provider: 'google' | 'outlook', calendarEmail: string, availabilityStart: string, availabilityEnd: string, availableDays: string, consultationPlatforms: string): Observable<IBookingCalendarSettings> { return this.http.put<IBookingCalendarSettings>(`${this.base}/admin/booking-calendar-settings`, { provider, calendarEmail, availabilityStart, availabilityEnd, availableDays, consultationPlatforms }, { withCredentials: true }); }
}
