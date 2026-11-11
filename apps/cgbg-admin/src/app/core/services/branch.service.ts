import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BusinessSchedule {
  id?: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  openTime2?: string;
  closeTime2?: string;
  isOpen: boolean;
}

export interface WorkException {
  id?: string;
  exceptionDate: string | Date;
  reason?: string;
  isFullDay: boolean;
  startTime?: string;
  endTime?: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  city?: string;
  phone?: string;
}

import { EnvironmentService } from './environment.service';

@Injectable({
  providedIn: 'root'
})
export class BranchService {
  private readonly apiUrl: string;

  constructor(
    private http: HttpClient,
    private env: EnvironmentService
  ) {
    this.apiUrl = `${this.env.apiUrl}/branches`;
  }

  // --- Branch Info ---
  getMyBranch(): Observable<Branch> {
    return this.http.get<Branch>(`${this.apiUrl}/mine`);
  }

  getBranch(id: string): Observable<Branch> {
    return this.http.get<Branch>(`${this.apiUrl}/${id}`);
  }

  updateBranch(id: string, branch: Partial<Branch>): Observable<Branch> {
    return this.http.patch<Branch>(`${this.apiUrl}/${id}`, branch);
  }

  // --- Schedules ---
  getSchedules(branchId: string): Observable<BusinessSchedule[]> {
    return this.http.get<BusinessSchedule[]>(`${this.apiUrl}/${branchId}/schedules`);
  }

  updateSchedules(branchId: string, schedules: BusinessSchedule[]): Observable<BusinessSchedule[]> {
    return this.http.post<BusinessSchedule[]>(`${this.apiUrl}/${branchId}/schedules`, { schedules });
  }

  // --- Exceptions (Holidays) ---
  getExceptions(branchId: string): Observable<WorkException[]> {
    return this.http.get<WorkException[]>(`${this.apiUrl}/${branchId}/exceptions`);
  }

  addException(branchId: string, exception: Partial<WorkException>): Observable<WorkException> {
    return this.http.post<WorkException>(`${this.apiUrl}/${branchId}/exceptions`, exception);
  }

  removeException(id: string): Observable<void> {
    // Note: Delete endpoint in backend is usually by exception ID directly
    return this.http.delete<void>(`${this.apiUrl}/exceptions/${id}`);
  }
}
