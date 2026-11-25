import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { CreateCustomerRequest, CustomerDetail, CustomerListItem } from '@cgbg/shared-types';

/** Cliente final del negocio (Customer, S1-01). Tipos del contrato compartido. */
export type Client = CustomerListItem;
export type ClientDetail = CustomerDetail;

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

  getClient(id: string): Observable<ClientDetail> {
    return this.http.get<ClientDetail>(`${this.apiUrl}/${id}`);
  }

  create(client: CreateCustomerRequest): Observable<Client> {
    return this.http.post<Client>(this.apiUrl, client);
  }
}
