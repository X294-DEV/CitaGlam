import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardMetrics {
  revenue: number;
  appointmentsCount: number;
  newClients: number;
  occupancy: number;
}

export interface RevenueChartData {
  date: string;
  amount: number;
}

export interface ServiceStat {
  name: string;
  count: number;
  color: string;
}

import { EnvironmentService } from './environment.service';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly apiUrl: string;

  constructor(
    private http: HttpClient,
    private env: EnvironmentService
  ) {
    this.apiUrl = `${this.env.apiUrl}/dashboard`;
  }

  getMetrics(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(`${this.apiUrl}/metrics`);
  }

  getRevenueChart(): Observable<RevenueChartData[]> {
    return this.http.get<RevenueChartData[]>(`${this.apiUrl}/revenue-chart`);
  }

  getServiceStats(): Observable<ServiceStat[]> {
    return this.http.get<ServiceStat[]>(`${this.apiUrl}/service-stats`);
  }
}
