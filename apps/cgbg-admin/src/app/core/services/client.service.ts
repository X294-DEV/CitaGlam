import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Appointment } from './appointment.service';

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  totalSpent: number;
  appointmentsCount: number;
  lastVisit?: string | Date;
  appointments?: Appointment[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

import { EnvironmentService } from './environment.service';

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private readonly apiUrl: string;

  constructor(
    private http: HttpClient,
    private env: EnvironmentService
  ) {
    this.apiUrl = `${this.env.apiUrl}/clients`;
  }

  getClients(): Observable<Client[]> {
    return this.http.get<Client[]>(this.apiUrl);
  }

  getClient(id: string): Observable<Client> {
    return this.http.get<Client>(`${this.apiUrl}/${id}`);
  }

  create(client: Partial<Client>): Observable<Client> {
    return this.http.post<Client>(this.apiUrl, client);
  }
}
