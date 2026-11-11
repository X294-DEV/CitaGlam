import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class EnvironmentService {
  // Centralized configuration for Docker Readiness
  // We use 3001 as the primary port for NestJS (consistent with docker-compose)
  private readonly _apiUrl = signal('http://localhost:3001');
  readonly pwaDebug = signal(true);

  get apiUrl() {
    return this._apiUrl();
  }

  // Helper for generating full resource URLs (e.g. for uploaded evidence)
  formatUrl(path: string): string {
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiUrl}${cleanPath}`;
  }
}
