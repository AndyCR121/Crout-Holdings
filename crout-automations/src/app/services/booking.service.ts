import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EnvironmentService } from './environment.service';

export interface IBooking { bookingId: number; userId: number; clientName: string; clientEmail: string; startsAt: string; endsAt: string; status: string; }
export interface IAvailabilityBlock { availabilityBlockId: number; startsAt: string; endsAt: string; note?: string; }
export interface IBookingCalendar { bookings: IBooking[]; blocks: IAvailabilityBlock[]; }

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvironmentService);
  private get base(): string { return this.env.apiUrl; }
  getCalendar(from: string, to: string): Observable<IBookingCalendar> { return this.http.get<IBookingCalendar>(`${this.base}/bookings/calendar`, { params: { from, to } }); }
  getAdminCalendar(from: string, to: string): Observable<IBookingCalendar> { return this.http.get<IBookingCalendar>(`${this.base}/bookings/calendar/admin`, { params: { from, to }, withCredentials: true }); }
  create(startsAt: string): Observable<IBooking> { return this.http.post<IBooking>(`${this.base}/bookings`, { startsAt }, { withCredentials: true }); }
  createBlock(startsAt: string, endsAt: string, note: string): Observable<IAvailabilityBlock> { return this.http.post<IAvailabilityBlock>(`${this.base}/bookings/availability-blocks`, { startsAt, endsAt, note }, { withCredentials: true }); }
  deleteBlock(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/bookings/availability-blocks/${id}`, { withCredentials: true }); }
}
