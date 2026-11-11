import { Injectable, effect, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { EnvironmentService } from './environment.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class AppNotificationService {
  private socket: Socket | null = null;
  private readonly endpoint: string;
  
  notifications = signal<any[]>([]);
  unreadCount = signal(0);

  constructor(
    private env: EnvironmentService,
    private auth: AuthService,
    private toasts: NotificationService,
    private http: HttpClient
  ) {
    console.log('[AppNotificationService] Constructor called.');
    this.endpoint = `${this.env.apiUrl}/notifications`;

    // Efectos de señales deben estar en el constructor para heredar el contexto de inyección
    effect(() => {
      // Solo actuar cuando la app sea estable (ngOnInit de App ejecutado)
      if (!this.auth.isAppStable()) return;

      const user = this.auth.currentUser();
      if (user) {
        console.log('[AppNotificationService] Stable and authenticated. Starting services.');
        this.connect(user.id);
        this.loadHistory();
      } else {
        this.disconnect();
      }
    });
  }

  init() {
    console.log('[AppNotificationService] init() called.');
  }

  private connect(userId: string) {
    if (this.socket) return;

    this.socket = io(`${this.env.apiUrl}/notifications`, {
      query: { userId },
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      console.log('[AppNotificationService] Connected to Notification Gateway');
    });

    this.socket.on('new_notification', (notification: any) => {
      this.notifications.update(prev => [notification, ...prev]);
      this.unreadCount.update(count => count + 1);
      
      // Show professional toast
      this.toasts.success(notification.title, notification.message);
    });

    this.socket.on('disconnect', () => {
      console.log('[AppNotificationService] Disconnected from Notification Gateway');
    });
  }

  private disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.notifications.set([]);
    this.unreadCount.set(0);
  }

  private loadHistory() {
    this.http.get<any[]>(this.endpoint).subscribe({
      next: (list) => {
        this.notifications.set(list);
        this.unreadCount.set(list.filter(n => !n.isRead).length);
      },
      error: (err) => console.error('Failed to load notifications', err)
    });
  }

  markAsRead(id: string) {
    this.http.patch(`${this.endpoint}/${id}/read`, {}).subscribe(() => {
      this.notifications.update(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      this.updateUnreadCount();
    });
  }

  markAllAsRead() {
    this.http.patch(`${this.endpoint}/read-all`, {}).subscribe(() => {
      this.notifications.update(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      );
      this.unreadCount.set(0);
    });
  }

  private updateUnreadCount() {
    const count = this.notifications().filter(n => !n.isRead).length;
    this.unreadCount.set(count);
  }

  delete(id: string) {
    return this.http.delete(`${this.endpoint}/${id}`).pipe(
      tap(() => {
        this.notifications.update(prev => prev.filter(n => n.id !== id));
        this.updateUnreadCount();
      })
    );
  }

  clearByRange(days: number) {
    return this.http.delete(`${this.endpoint}/clear-range/${days}`).pipe(
      tap(() => {
        const cutOffDate = new Date();
        cutOffDate.setDate(cutOffDate.getDate() - days);
        
        this.notifications.update(prev => 
           prev.filter(n => new Date(n.createdAt) > cutOffDate)
        );
        this.updateUnreadCount();
      })
    );
  }

  clearAll() {
    return this.http.delete(`${this.endpoint}/all`).pipe(
      tap(() => {
        this.notifications.set([]);
        this.unreadCount.set(0);
      })
    );
  }
}
