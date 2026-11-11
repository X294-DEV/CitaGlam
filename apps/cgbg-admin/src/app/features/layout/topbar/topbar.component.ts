import { Component, ElementRef, HostListener, NgZone, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavService } from '../../../core/services/nav.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppNotificationService } from '../../../core/services/app-notification.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { 
  LucideAngularModule, 
  Menu, 
  User, 
  LogOut, 
  Bell,
  ChevronDown,
  BellOff,
  Clock,
  ExternalLink,
  CheckCircle,
  Info,
  Send
} from 'lucide-angular';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    CommonModule, 
    LucideAngularModule
  ],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css'
})
export class TopbarComponent {
  navService = inject(NavService);
  authService = inject(AuthService);
  notificationService = inject(AppNotificationService);
  router = inject(Router);
  elementRef = inject(ElementRef);
  zone = inject(NgZone);

  showNotifications = signal(false);
  showUserMenu = signal(false);

  constructor() {
    // Robust auto-close on navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.zone.run(() => {
        this.closeAll();
      });
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    // Check if click is outside the buttons or their corresponding panels
    const isOutsideNotifications = !target.closest('.top-action-container');
    const isOutsideUserMenu = !target.closest('.user-profile');

    if (isOutsideNotifications && isOutsideUserMenu) {
      this.closeAll();
    }
  }

  private closeAll() {
    this.showNotifications.set(false);
    this.showUserMenu.set(false);
  }

  handleNotificationClick(notification: any) {
    this.showNotifications.set(false); // Close immediately
    
    // Mark as read
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id);
    }

    // Action execution
    if (notification.actionUrl) {
      const url = notification.actionUrl;
      if (url.startsWith('/')) {
        this.router.navigateByUrl(url);
      } else {
        window.open(url, '_blank');
      }
    }
  }

  goToAllNotifications() {
    this.showNotifications.set(false);
    this.router.navigate(['/admin/saas/notifications']);
  }

  toggleNotifications() {
    this.showNotifications.set(!this.showNotifications());
    if (this.showNotifications()) this.showUserMenu.set(false);
  }

  toggleUserMenu() {
    this.showUserMenu.set(!this.showUserMenu());
    if (this.showUserMenu()) this.showNotifications.set(false);
  }

  toggleSidebar() {
    this.navService.toggleSidebar();
  }

  async logout() {
    const result = await Swal.fire({
      title: '¿Cerrar Sesión?',
      text: '¿Estás seguro de que deseas salir del sistema?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, salir 🔒',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2D4A47',
      cancelButtonColor: '#CDD7D6',
      background: '#FAFCFB',
      color: '#1A3E3B'
    });

    if (result.isConfirmed) {
      this.authService.logout();
      window.location.reload(); 
    }
  }

  getUserInitials(): string {
    const user = this.authService.currentUser();
    if (!user) return 'AD';
    
    const parts = [];
    if (user.firstName) parts.push(user.firstName);
    if (user.lastName) parts.push(user.lastName);
    
    if (parts.length === 0) return 'AD';
    
    return parts
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }
}
