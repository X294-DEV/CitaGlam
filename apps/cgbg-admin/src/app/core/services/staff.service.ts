import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EnvironmentService } from './environment.service';

export interface StaffMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateStaffDto {
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'STAFF' | 'SUPERADMIN';
}

@Injectable({
  providedIn: 'root'
})
export class StaffService {
  private readonly apiUrl: string;

  constructor(
    private http: HttpClient,
    private env: EnvironmentService
  ) {
    this.apiUrl = `${this.env.apiUrl}/users/staff`;
  }

  getStaff(): Observable<StaffMember[]> {
    return this.http.get<StaffMember[]>(this.apiUrl);
  }

  createStaff(dto: CreateStaffDto): Observable<StaffMember> {
    return this.http.post<StaffMember>(this.apiUrl, dto);
  }

  deleteStaff(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
