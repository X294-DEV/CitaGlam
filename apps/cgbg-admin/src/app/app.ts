import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IdleService } from './core/services/idle.service';
import { AuthService } from './core/services/auth.service';
import { PwaService } from './core/services/pwa.service';
import { AppNotificationService } from './core/services/app-notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html'
})
export class App implements OnInit {
  protected readonly title = signal('cgbg-admin');

  constructor(
    private idleService: IdleService,
    private authService: AuthService,
    private pwaService: PwaService,
    private notificationService: AppNotificationService
  ) {}

  ngOnInit() {
    console.log('[App] Initializing root application component...');
    this.idleService.startWatching();
    
    // Notificar que la app es estable para servicios reactivos
    this.authService.isAppStable.set(true);
    
    // Inicializar servicios secundarios de forma segura tras el arranque
    this.pwaService.init();
    this.notificationService.init();
  }
}
