import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ServiceCategory {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
  services?: Service[];
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  durationMin: number;
  price: number;
  imageUrl?: string;
  color?: string;
  isActive: boolean;
  categoryId?: string;
  category?: ServiceCategory;
}

import { EnvironmentService } from './environment.service';

@Injectable({
  providedIn: 'root'
})
export class ServicesService {
  private readonly apiUrl: string;

  constructor(
    private http: HttpClient,
    private env: EnvironmentService
  ) {
    this.apiUrl = `${this.env.apiUrl}/services`;
  }

  // --- Categories ---
  getCategories(): Observable<ServiceCategory[]> {
    return this.http.get<ServiceCategory[]>(`${this.apiUrl}/categories`);
  }

  createCategory(category: Partial<ServiceCategory>): Observable<ServiceCategory> {
    return this.http.post<ServiceCategory>(`${this.apiUrl}/categories`, category);
  }

  updateCategory(id: string, category: Partial<ServiceCategory>): Observable<ServiceCategory> {
    return this.http.patch<ServiceCategory>(`${this.apiUrl}/categories/${id}`, category);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/categories/${id}`);
  }

  // --- Services ---
  getServices(showInactive = false): Observable<Service[]> {
    return this.http.get<Service[]>(`${this.apiUrl}?showInactive=${showInactive}`);
  }

  getService(id: string): Observable<Service> {
    return this.http.get<Service>(`${this.apiUrl}/${id}`);
  }

  createService(service: Partial<Service>): Observable<Service> {
    return this.http.post<Service>(this.apiUrl, service);
  }

  updateService(id: string, service: Partial<Service>): Observable<Service> {
    return this.http.patch<Service>(`${this.apiUrl}/${id}`, service);
  }

  deleteService(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
