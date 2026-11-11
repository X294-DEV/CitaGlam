import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, throwError, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  // Bypassear peticiones de autenticación para evitar bucles infinitos (DI Cycle)
  // Especialmente crítico durante el bootstrap de la aplicación
  if (req.url.includes('/auth/')) {
    return next(req);
  }

  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);

  // Si la app aún no es estable, evitamos lógica compleja que podría disparar el inyector
  // Esto es un segundo nivel de seguridad para el arranque inicial
  if (!authService.isAppStable()) {
    return next(req);
  }

  const token = authService.getToken();
  let request = req;

  if (token) {
    request = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && token) {
        console.warn('[AuthInterceptor] 401 Unauthorized detected. Attempting silent refresh.');
        
        return authService.refresh().pipe(
          switchMap((res: any) => {
            console.log('[AuthInterceptor] Refresh successful, retrying original request.');
            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${res.access_token}`
              }
            });
            return next(retryReq);
          }),
          catchError((refreshErr) => {
            console.error('[AuthInterceptor] Refresh failed. Final logout.');
            authService.logout();
            notificationService.error('Sesión Expirada', 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
            router.navigate(['/auth/login']);
            return throwError(() => refreshErr);
          })
        );
      }
      
      return throwError(() => error);
    })
  );
};
