import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TenantStats {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  subscriptionExpiresAt: string;
  package: {
    id: string;
    name: string;
  };
  users?: {
    password?: string;
    email: string;
  }[];
  isPending?: boolean;
  _count: {
    users: number;
    branches: number;
  };
}

export interface PendingSubscription {
  id: string;
  amount: number;
  monthsCount: number;
  evidenceUrl: string;
  createdAt: string;
  tenant: {
    name: string;
  };
  package: {
    name: string;
  };
}

export interface ProcessedSubscription extends PendingSubscription {
  status: 'APPROVED' | 'REJECTED';
  approvedAt?: string;
  adminNotes?: string;
}

export interface Package {
  id: string;
  name: string;
  description?: string;
  price: number;
  interval: string;
  trialDays: number;
  isActive: boolean;
  isPublic: boolean;
  pricesByTerm?: { [key: string]: number };
  limits: any;
  features: any;
}

export interface Promotion {
  id: string;
  code: string;
  description?: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number;
  validUntil?: string;
  maxUses?: number;
  usedCount: number;
  isActive: boolean;
}

import { EnvironmentService } from './environment.service';

@Injectable({
  providedIn: 'root'
})
export class SuperAdminService {
  constructor(
    private http: HttpClient,
    private env: EnvironmentService
  ) {}

  private get apiUrl() { return `${this.env.apiUrl}/admin/global`; }
  private get subscriptionsUrl() { return `${this.env.apiUrl}/admin/subscriptions`; }
  private get packagesUrl() { return `${this.env.apiUrl}/admin/packages`; }
  private get promotionsUrl() { return `${this.env.apiUrl}/promotions`; }
  private get financeUrl() { return `${this.env.apiUrl}/admin/finance`; }

  getTenants(): Observable<TenantStats[]> {
    return this.http.get<TenantStats[]>(`${this.apiUrl}/tenants`);
  }

  createTenant(tenant: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/tenants`, tenant);
  }

  createExpressTenant(tenant: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/tenants/express`, tenant);
  }

  updateTenant(id: string, tenant: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/tenants/${id}`, tenant);
  }

  toggleTenantStatus(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/tenants/${id}/status`, {});
  }

  resendInvitation(id: string, email?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/tenants/${id}/resend-invitation`, { email });
  }

  getPendingSubscriptions(): Observable<PendingSubscription[]> {
    return this.http.get<PendingSubscription[]>(
      `${this.subscriptionsUrl}/pending`,
    );
  }

  getProcessedHistory(): Observable<ProcessedSubscription[]> {
    return this.http.get<ProcessedSubscription[]>(
      `${this.subscriptionsUrl}/history`,
    );
  }

  approveSubscription(id: string): Observable<any> {
    return this.http.patch(`${this.subscriptionsUrl}/process/${id}`, {
      status: 'APPROVED',
    });
  }

  rejectSubscription(id: string, reason: string): Observable<any> {
    return this.http.patch(`${this.subscriptionsUrl}/process/${id}`, {
      status: 'REJECTED',
      adminNotes: reason,
    });
  }

  getGlobalStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats`);
  }

  // --- Package Management ---

  getPackages(): Observable<Package[]> {
    return this.http.get<Package[]>(this.packagesUrl);
  }

  createPackage(pkg: Partial<Package>): Observable<Package> {
    return this.http.post<Package>(this.packagesUrl, pkg);
  }

  updatePackage(id: string, pkg: Partial<Package>): Observable<Package> {
    return this.http.patch<Package>(`${this.packagesUrl}/${id}`, pkg);
  }

  // --- Promotion Management ---

  getPromotions(): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(this.promotionsUrl);
  }

  createPromotion(promo: Partial<Promotion>): Observable<Promotion> {
    return this.http.post<Promotion>(this.promotionsUrl, promo);
  }

  updatePromotion(id: string, promo: Partial<Promotion>): Observable<Promotion> {
    return this.http.patch<Promotion>(`${this.promotionsUrl}/${id}`, promo);
  }

  validatePromotion(code: string): Observable<Promotion> {
    return this.http.get<Promotion>(`${this.promotionsUrl}/validate/${code}`);
  }

  // --- Global Config ---

  getGlobalConfig(): Observable<any> {
    return this.http.get(`${this.apiUrl}/config`);
  }

  updateGlobalConfig(config: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/config`, config);
  }

  getEmailPreview(body: string, subject: string): Observable<{ html: string }> {
    return this.http.post<{ html: string }>(`${this.apiUrl}/email-preview`, {
      body,
      subject,
    });
  }

  testEmailConfig(config: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/test-email`, config);
  }

  sendTestTemplate(to: string, subject: string, body: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/send-test-template`, {
      to,
      subject,
      body,
    });
  }

  // --- Business Request Management ---

  getBusinessRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/business-requests`);
  }

  sendNegotiatedProposal(requestId: string, proposal: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/business-requests/${requestId}/proposal`, proposal);
  }

  approveBusinessRequest(requestId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/business-requests/${requestId}/approve`, {});
  }

  rejectBusinessRequest(requestId: string, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/business-requests/${requestId}/reject`, { reason });
  }

  getBusinessRequestProofs(requestId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/business-requests/${requestId}/proofs`);
  }

  // --- Financial Management ---

  getFinancialHealth(): Observable<any> {
    return this.http.get(`${this.financeUrl}/health`);
  }

  getExpenses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.financeUrl}/expenses`);
  }

  createExpense(expense: any): Observable<any> {
    return this.http.post(`${this.financeUrl}/expenses`, expense);
  }

  updateExpense(id: string, expense: any): Observable<any> {
    return this.http.patch(`${this.financeUrl}/expenses/${id}`, expense);
  }

  deleteExpense(id: string): Observable<any> {
    return this.http.delete(`${this.financeUrl}/expenses/${id}`);
  }
}
