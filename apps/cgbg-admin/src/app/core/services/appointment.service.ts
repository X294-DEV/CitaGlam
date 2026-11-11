import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type AppointmentStatus = 'PENDING_PAYMENT' | 'WAITING_APPROVAL' | 'AUTHORIZED' | 'COMPLETED' | 'CANCELLED';

export interface Appointment {
  id: string;
  tenantId: string;
  clientId: string;
  branchId: string;
  serviceId: string;
  startTime: string | Date;
  endTime: string | Date;
  status: AppointmentStatus;
  notes?: string;
  client?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  service?: {
    name: string;
    color: string;
    durationMin: number;
    price: number;
  };
  branch?: {
    name: string;
    address: string;
  };
  payment?: {
    id: string;
    amount: number | string;
    receiptUrl?: string;
    isApproved: boolean;
    approvedAt?: string | Date;
  };
}

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

  create(dto: any): Observable<Appointment> {
    return this.http.post<Appointment>(this.apiUrl, dto);
  }

  approve(id: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}/approve`, {});
  }

  reject(id: string, reason?: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}/reject`, { reason });
  }

  reschedule(id: string, dto: any): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}/reschedule`, dto);
  }

  updateStatus(id: string, status: AppointmentStatus, reason?: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.apiUrl}/${id}/status`, { status, reason });
  }

  cancel(id: string): Observable<Appointment> {
    return this.http.delete<Appointment>(`${this.apiUrl}/${id}`);
  }

  getAvailability(branchId: string, serviceId: string, date: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/available`, {
      params: { branchId, serviceId, date }
    });
  }
}
