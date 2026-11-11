import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { fromEvent, merge, Subscription, timer } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class IdleService {
  private readonly IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutos
  private readonly COUNTDOWN_TIME = 30; // 30 segundos para confirmar

  private idleSub?: Subscription;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  startWatching() {
    this.stopWatching();

    // Eventos que resetean la inactividad
    const activity$ = merge(
      fromEvent(window, 'mousemove'),
      fromEvent(window, 'click'),
      fromEvent(window, 'keydown'),
      fromEvent(window, 'scroll')
    );

    this.ngZone.runOutsideAngular(() => {
      this.idleSub = activity$.pipe(
        // Inicia/Resetea el timer de 15m cada vez que hay actividad
        switchMap(() => timer(this.IDLE_TIMEOUT)),
        tap(() => {
          // Cuando el timer completa, volvemos a la zona de Angular para la UI
          this.ngZone.run(() => this.showIdleModal());
        })
      ).subscribe();
    });
  }

  stopWatching() {
    this.idleSub?.unsubscribe();
  }

  private async showIdleModal() {
    // Si no está autenticado, no tiene sentido mostrar el modal
    if (!this.authService.isAuthenticated()) return;

    const result = await this.notificationService.sessionExpiry(this.COUNTDOWN_TIME);

    if (result.isConfirmed) {
      // Usuario pidió extender: intentamos refrescar el token
      this.authService.refresh().subscribe({
        next: () => {
          console.log('[IdleService] Session extended successfully.');
          this.startWatching(); // Reiniciamos la vigilancia
        },
        error: () => this.handleLogout()
      });
    } else {
      // Usuario canceló o se acabó el tiempo
      this.handleLogout();
    }
  }

  private handleLogout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
    this.stopWatching();
  }
}
