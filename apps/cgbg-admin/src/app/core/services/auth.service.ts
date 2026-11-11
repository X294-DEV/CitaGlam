import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, throwError, Observable } from 'rxjs';
import { EnvironmentService } from './environment.service';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  role: string;
  tenantId: string;
  isActive?: boolean;
  packageFeatures?: any;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl: string;
  private readonly TOKEN_KEY = 'cgbg_token';
  private readonly REFRESH_TOKEN_KEY = 'cgbg_refresh_token';
  private readonly USER_KEY = 'cgbg_user';
  private readonly REMEMBER_KEY = 'cgbg_remember_email';

  currentUser = signal<User | null>(null);
  isAppStable = signal(false);

  constructor(
    private http: HttpClient,
    private env: EnvironmentService
  ) {
    console.log('[AuthService] Initializing constructor...');
    this.apiUrl = `${this.env.apiUrl}/auth`;
    
    const savedUser = localStorage.getItem(this.USER_KEY);
    if (savedUser) {
      try {
        this.currentUser.set(JSON.parse(savedUser));
        console.log('[AuthService] Local user loaded:', this.currentUser()?.email);
      } catch {
        localStorage.removeItem(this.USER_KEY);
      }
    }
  }

  login(dto: any, remember: boolean) {
    console.log('[AuthService] Attempting login for:', dto.email);
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, dto).pipe(
      tap(res => {
        console.log('[AuthService] Login response received, storing tokens.');
        localStorage.setItem(this.TOKEN_KEY, res.access_token);
        localStorage.setItem(this.REFRESH_TOKEN_KEY, res.refresh_token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
        this.currentUser.set(res.user);
        console.log('[AuthService] Current user set in signal.');
        
        if (remember) {
          localStorage.setItem(this.REMEMBER_KEY, dto.email);
        } else {
          localStorage.removeItem(this.REMEMBER_KEY);
        }
      })
    );
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
  }

  getSavedEmail(): string | null {
    return localStorage.getItem(this.REMEMBER_KEY);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  refresh() {
    const userId = this.currentUser()?.id;
    const refreshToken = this.getRefreshToken();

    if (!userId || !refreshToken) {
      this.logout();
      return throwError(() => new Error('No session data found'));
    }

    return this.http.post<LoginResponse>(`${this.apiUrl}/refresh`, { userId, refreshToken }).pipe(
      tap(res => {
        localStorage.setItem(this.TOKEN_KEY, res.access_token);
        localStorage.setItem(this.REFRESH_TOKEN_KEY, res.refresh_token);
      })
    );
  }

  completeExpressActivation(dto: any) {
    return this.http.post<any>(`${this.apiUrl}/complete-express-activation`, dto).pipe(
      tap(res => {
        if (res.access_token && res.user) {
          localStorage.setItem(this.TOKEN_KEY, res.access_token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
          this.currentUser.set(res.user);
        }
      })
    );
  }

  resendActivation(email: string) {
    return this.http.post<any>(`${this.apiUrl}/resend-activation`, { email });
  }

  forgotPassword(email: string) {
    return this.http.post<any>(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(dto: any) {
    return this.http.post<any>(`${this.apiUrl}/reset-password`, dto).pipe(
      tap(res => {
        if (res.access_token && res.user) {
          localStorage.setItem(this.TOKEN_KEY, res.access_token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
          this.currentUser.set(res.user);
        }
      })
    );
  }

  // --- Business Request Flow ---

  registerBusinessRequest(dto: any) {
    return this.http.post<any>(`${this.apiUrl}/register-request`, dto);
  }

  getPublicConfig(): Observable<{ systemName: string; turnstileSiteKey: string }> {
    return this.http.get<{ systemName: string; turnstileSiteKey: string }>(`${this.apiUrl}/config/public`);
  }

  uploadPaymentProof(id: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/upload-payment-evidence/${id}`, formData);
  }

  getBusinessRequest(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/business-request/${id}`);
  }
}
