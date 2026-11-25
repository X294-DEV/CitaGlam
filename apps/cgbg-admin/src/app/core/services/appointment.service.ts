import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import type {
  AppointmentDto,
  AppointmentStatus as ContractAppointmentStatus,
  AvailabilityResponse,
  CreateAppointmentRequest,
  RescheduleAppointmentRequest,
} from '@cgbg/shared-types';

/** Tipos del contrato compartido (S1-05): ya no se mantienen interfaces locales. */
export type AppointmentStatus = ContractAppointmentStatus;
export type Appointment = AppointmentDto;

import { EnvironmentService } from './environment.service';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private readonly apiUrl: string;

  constructor(
    private http: HttpClient,
    private env: EnvironmentService
  ) {
    this.apiUrl = `${this.env.apiUrl}/appointments`;
  }

  getAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}/merchant`);
  }

  getPendingApproval(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}/pending-approval`);
  }

  getAppointment(id: string): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.apiUrl}/${id}`);
  }

  create(dto: CreateAppointmentRequest): Observable<Appointment> {
    return this.http.post<Appointment>(this.apiUrl, dto);
  }

  approve(id: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}/approve`, {});
  }

  reject(id: string, reason?: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}/reject`, { reason });
  }

  reschedule(id: string, dto: RescheduleAppointmentRequest): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}/reschedule`, dto);
  }

  updateStatus(id: string, status: AppointmentStatus, reason?: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}/status`, { status, reason });
  }

  cancel(id: string): Observable<Appointment> {
    return this.http.delete<Appointment>(`${this.apiUrl}/${id}`);
  }

  getAvailability(branchId: string, serviceId: string, date: string): Observable<AvailabilityResponse> {
    return this.http.get<AvailabilityResponse>(`${this.apiUrl}/available`, {
      params: { branchId, serviceId, date }
    });
  }
}
