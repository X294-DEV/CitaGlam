import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MySubscriptionPayment {
  id: string;
  amount: number;
  monthsCount: number;
  status: string;
  evidenceUrl: string;
  createdAt: string;
  approvedAt: string;
  package: {
    name: string;
  };
}

import { EnvironmentService } from './environment.service';

@Injectable({
  providedIn: 'root'
})
export class MySubscriptionService {
  private readonly apiUrl: string;

  constructor(
    private http: HttpClient,
    private env: EnvironmentService
  ) {
    this.apiUrl = `${this.env.apiUrl}/subscriptions`;
  }

  getHistory(): Observable<MySubscriptionPayment[]> {
    return this.http.get<MySubscriptionPayment[]>(`${this.apiUrl}/my-history`);
  }

  getPackages(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/packages`);
  }
}
