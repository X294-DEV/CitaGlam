import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppNotificationService } from '../../../core/services/app-notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { 
  LucideAngularModule, 
  Bell, 
  CheckCircle, 
  Info, 
  ExternalLink, 
  Trash2, 
  Search,
  Check,
  Filter,
  ArrowRight,
  Clock,
  BellOff,
  AlertTriangle,
  RotateCcw
} from 'lucide-angular';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-saas-notifications',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  template: `
    <div class="notifications-page" (click)="showCleanup = false">
      <header class="page-header">
        <div class="header-content">
          <div class="header-title-group">
            <div class="header-icon-box">
              <i-lucide name="bell"></i-lucide>
            </div>
            <div>
              <h1>Centro de Notificaciones</h1>
              <p>Gestiona todos los eventos y alertas del sistema SaaS</p>
            </div>
          </div>
        </div>
        <div class="header-actions">
           <!-- Cleanup Dropdown -->
           <div class="cleanup-container" (click)="$event.stopPropagation()">
             <button 
               class="btn-outline" 
               [class.active]="showCleanup"
               (click)="showCleanup = !showCleanup"
             >
               <i-lucide name="trash-2" class="icon-sm"></i-lucide>
               <span>Limpiar Historial</span>
               <i-lucide name="chevron-down" class="icon-xxs" [class.rotated]="showCleanup"></i-lucide>
             </button>

             <div class="dropdown-menu glass" *ngIf="showCleanup">
                <div class="menu-label">Filtrar por antigüedad:</div>
                <button (click)="handleCleanupAction('7')">
                   <i-lucide name="clock" class="icon-xxs"></i-lucide>
                   Mayores a 7 días
                </button>
                <button (click)="handleCleanupAction('15')">
                   <i-lucide name="clock" class="icon-xxs"></i-lucide>
                   Mayores a 15 días
                </button>
                <button (click)="handleCleanupAction('30')">
                   <i-lucide name="clock" class="icon-xxs"></i-lucide>
                   Mayores a 30 días
                </button>
                
                <ng-container *ngIf="isSuperAdmin()">
                  <div class="menu-divider"></div>
                  <button class="danger-item" (click)="handleCleanupAction('all')">
                     <i-lucide name="alert-triangle" class="icon-xxs"></i-lucide>
                     BORRAR TODO
                  </button>
                </ng-container>
             </div>
           </div>

           <button 
             class="btn-secondary" 
             (click)="notificationService.markAllAsRead()"
             *ngIf="notificationService.unreadCount() > 0"
           >
             <i-lucide name="check" class="icon-sm"></i-lucide>
             <span>Marcar todas como leídas</span>
           </button>
        </div>
      </header>

      <div class="notifications-container glass-panel">
        <div class="panel-header">
          <div class="search-bar">
            <i-lucide name="search"></i-lucide>
            <input 
              type="text" 
              placeholder="Buscar alertas por título o mensaje..." 
              [(ngModel)]="searchQuery"
            >
          </div>
          <div class="filter-group">
            <button 
              [class.active]="filter() === 'ALL'" 
              (click)="filter.set('ALL')"
            >
              Todas
            </button>
            <button 
              [class.active]="filter() === 'UNREAD'" 
              (click)="filter.set('UNREAD')"
            >
              Pendientes
              <span class="count-badge" *ngIf="notificationService.unreadCount() > 0">
                {{ notificationService.unreadCount() }}
              </span>
            </button>
          </div>
        </div>

        <div class="notifications-list" *ngIf="filteredNotifications().length > 0">
           <div 
             *ngFor="let n of filteredNotifications()" 
             class="notif-card" 
             [class.unread]="!n.isRead"
           >
              <div class="notif-icon-wrapper" [ngClass]="n.type.toLowerCase()" (click)="handleClick(n)">
                <i-lucide [name]="n.type === 'SUCCESS' ? 'check-circle' : 'info'"></i-lucide>
              </div>
              <div class="notif-content">
                <div class="notif-header" (click)="handleClick(n)">
                  <div class="title-row">
                    <h3>{{ n.title }}</h3>
                    <button class="btn-delete-item" (click)="confirmDeleteOne(n.id); $event.stopPropagation()">
                      <i-lucide name="trash-2"></i-lucide>
                    </button>
                  </div>
                  <span class="notif-time">
                    <i-lucide name="clock" class="icon-xxs"></i-lucide>
                    {{ n.createdAt | date:'dd/MM/yyyy hh:mm:ss a' }}
                  </span>
                </div>
                <div (click)="handleClick(n)">
                  <p>{{ n.message }}</p>
                </div>
                <div class="notif-actions">
                  <span class="status-indicator" *ngIf="!n.isRead" (click)="handleClick(n)">
                    <span class="dot"></span>
                    Sin leer
                  </span>
                  <button class="btn-goto" *ngIf="n.actionUrl" (click)="handleClick(n)">
                    {{ n.actionType === 'EXTERNAL_LINK' ? 'Abrir enlace' : 'Ir al recurso' }}
                    <i-lucide [name]="n.actionType === 'EXTERNAL_LINK' ? 'external-link' : 'arrow-right'"></i-lucide>
                  </button>
                </div>
              </div>
           </div>
        </div>

        <div class="empty-state" *ngIf="filteredNotifications().length === 0">
             <div class="empty-icon-box">
                <i-lucide name="bell-off"></i-lucide>
             </div>
             <h2>Historial despejado</h2>
             <p>No tienes {{ filter() === 'UNREAD' ? 'notificaciones pendientes' : 'alertas registradas' }} en este momento.</p>
             <button class="btn-primary" *ngIf="filter() === 'UNREAD'" (click)="filter.set('ALL')">
               Ver todas las notificaciones
             </button>
          </div>
      </div>
    </div>
  `,
  styles: [`
    .notifications-page { padding: 2.5rem; max-width: 1100px; margin: 0 auto; animation: fadeIn 0.4s ease-out; }
    
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; gap: 2rem; }
    .header-title-group { display: flex; align-items: center; gap: 1.5rem; }
    .header-icon-box { 
      width: 56px; height: 56px; 
      background: rgba(74, 142, 138, 0.1); 
      color: #4A8E8A; 
      border-radius: 18px; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      flex-shrink: 0;
    }
    .header-icon-box i-lucide { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; }
    
    h1 { font-family: 'Outfit', sans-serif; font-size: 2.2rem; color: #1A3E3B; margin: 0; }
    .page-header p { color: #667; margin: 4px 0 0 0; font-size: 1.1rem; }
    
    .header-actions { display: flex; gap: 12px; align-items: center; }
    
    /* Dropdown UI */
    .cleanup-container { position: relative; }
    .btn-outline { background: white; color: #ef4444; border: 1.5px solid #fee2e2; padding: 12px 20px; border-radius: 12px; font-weight: 700; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: 0.3s; }
    .btn-outline:hover, .btn-outline.active { background: #fef2f2; border-color: #f87171; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.08); }
    .btn-outline i-lucide.rotated { transform: rotate(180deg); transition: 0.3s; }

    .dropdown-menu { position: absolute; top: calc(100% + 10px); right: 0; width: 240px; border-radius: 18px; padding: 10px; z-index: 1000; animation: slideDown 0.3s ease-out; box-shadow: 0 10px 40px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.2); }
    .dropdown-menu.glass { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); }
    
    .menu-label { padding: 10px 14px; font-size: 0.8rem; font-weight: 700; color: #9AA; text-transform: uppercase; letter-spacing: 0.5px; }
    .menu-divider { height: 1px; background: #F0F5F2; margin: 8px 10px; }
    
    .dropdown-menu button { width: 100%; text-align: left; background: transparent; border: none; padding: 14px 16px; border-radius: 12px; color: #1A3E3B; font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 12px; line-height: 1; }
    .dropdown-menu button i-lucide { display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; color: inherit; }
    .dropdown-menu button:hover { background: #F4F9F8; color: #4A8E8A; }
    .dropdown-menu button.danger-item { color: #ef4444; }
    .dropdown-menu button.danger-item:hover { background: #fef2f2; }

    .btn-secondary { background: #E1F3F1; color: #4A8E8A; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.3s; }
    .btn-secondary:hover { background: #4A8E8A; color: white; }

    .notifications-container { background: white; border-radius: 30px; overflow: hidden; display: flex; flex-direction: column; min-height: 600px; }
    /* ... rest of existing styles ... */
    
    .panel-header { padding: 2rem; border-bottom: 1px solid #F0F5F2; display: flex; justify-content: space-between; align-items: center; gap: 2rem; }
    .search-bar { flex: 1; min-width: 300px; background: #F8FBF9; border-radius: 16px; padding: 0 16px; display: flex; align-items: center; gap: 12px; border: 1.5px solid #F0F5F2; transition: 0.3s; }
    .search-bar:focus-within { border-color: #4A8E8A; background: white; box-shadow: 0 0 0 4px rgba(74, 142, 138, 0.05); }
    .search-bar i-lucide { color: #BDD2CD; width: 20px; }
    .search-bar input { border: none; background: transparent; padding: 14px 0; width: 100%; outline: none; font-size: 0.95rem; color: #1A3E3B; }

    .filter-group { display: flex; background: #F8FBF9; padding: 6px; border-radius: 14px; gap: 4px; }
    .filter-group button { border: none; background: transparent; padding: 8px 20px; border-radius: 10px; font-weight: 700; color: #889; cursor: pointer; transition: 0.3s; display: flex; align-items: center; gap: 8px; font-size: 0.9rem; }
    .filter-group button.active { background: white; color: #4A8E8A; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    
    .count-badge { background: #E57373; color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 6px; }

    .notifications-list { display: flex; flex-direction: column; }
    .notif-card { padding: 2rem; border-bottom: 1px solid #F8FBF9; cursor: pointer; transition: 0.3s; display: flex; gap: 1.5rem; position: relative; }
    .notif-card:hover { background: #FAFCFB; }
    .notif-card.unread { background: rgba(74, 142, 138, 0.02); }
    .notif-card.unread::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: #4A8E8A; }
    
    .notif-icon-wrapper { width: 48px; height: 48px; border-radius: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .notif-icon-wrapper.success { background: #E8F5E9; color: #4CAF50; }
    .notif-icon-wrapper.info { background: #E3F2FD; color: #2196F3; }
    .notif-icon-wrapper i-lucide { width: 24px; height: 24px; }

    .notif-content { flex: 1; }
    .notif-header { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
    .title-row { display: flex; justify-content: space-between; align-items: flex-start; }
    .notif-header h3 { margin: 0; font-family: 'Outfit', sans-serif; font-size: 1.3rem; color: #1A3E3B; font-weight: 700; }
    .notif-time { font-size: 0.85rem; color: #9AA; font-weight: 500; display: flex; align-items: center; gap: 8px; margin-top: 4px; }
    .notif-time i-lucide { display: flex; align-items: center; justify-content: center; width: 14px; height: 14px; color: #BDD2CD; }
    
    .btn-delete-item { background: transparent; border: none; color: #BDD2CD; padding: 8px; border-radius: 8px; cursor: pointer; transition: 0.2s; opacity: 0.3; }
    .notif-card:hover .btn-delete-item { opacity: 1; }
    .btn-delete-item:hover { background: #fee2e2; color: #ef4444; }
    .btn-delete-item i-lucide { width: 18px; height: 18px; }

    .notif-content p { color: #667; line-height: 1.6; margin: 0 0 20px 0; font-size: 1.1rem; }
    
    .notif-actions { display: flex; align-items: center; justify-content: space-between; }
    .status-indicator { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; font-weight: 700; color: #4A8E8A; }
    .dot { width: 8px; height: 8px; background: #4A8E8A; border-radius: 50%; }
    
    .btn-goto { background: transparent; border: 1px solid #E1ECE9; padding: 10px 20px; border-radius: 12px; color: #4A8E8A; font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.2s; }
    .btn-goto:hover { background: #4A8E8A; color: white; }

    .empty-state { padding: 6rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
    .empty-icon-box { width: 80px; height: 80px; background: #F0F7F6; color: #4A8E8A; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .empty-icon-box i-lucide { width: 40px; height: 40px; }
    .empty-state h2 { font-family: 'Outfit', sans-serif; color: #1A3E3B; margin: 0; }
    .empty-state p { color: #889; max-width: 400px; font-size: 1.1rem; }

    .btn-primary { background: #4A8E8A; color: white; border: none; padding: 14px 28px; border-radius: 14px; font-weight: 700; cursor: pointer; transition: 0.3s; }
    .btn-primary:hover { background: #3D7672; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(74,142,138,0.2); }

    .icon-xxs { width: 14px; height: 14px; }
    .icon-sm { width: 18px; height: 18px; }
    .glass-panel { border: 1px solid rgba(74, 142, 138, 0.1); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05); }

    @media (max-width: 768px) {
      .notifications-page { padding: 1.25rem; }
      .page-header { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
      .header-actions { width: 100%; flex-direction: column; }
      .btn-secondary, .btn-outline { width: 100%; justify-content: center; }
      .panel-header { flex-direction: column; gap: 1.5rem; padding: 1.5rem; }
      .search-bar { width: 100%; }
      .filter-group { width: 100%; }
      .filter-group button { flex: 1; }
      
      .notif-card { gap: 1.25rem; padding: 1.5rem; }
      .notif-icon-wrapper { width: 44px; height: 44px; }
      .notif-icon-wrapper i-lucide { width: 22px; height: 22px; }
      
      .notif-header h3 { font-size: 1.15rem; }
      .notif-time { font-size: 0.8rem; }
      
      .notif-content p { font-size: 1rem; margin-bottom: 20px; }
      .notif-actions { flex-direction: column; align-items: flex-start; gap: 16px; }
      .btn-goto { width: 100%; justify-content: center; padding: 12px; }
    }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class SaasNotificationsComponent implements OnInit {
  notificationService = inject(AppNotificationService);
  authService = inject(AuthService);
  private router = inject(Router);

  searchQuery = '';
  filter = signal<'ALL' | 'UNREAD'>('ALL');
  showCleanup = false;

  isSuperAdmin = computed(() => {
    const role = this.authService.currentUser()?.role?.toUpperCase();
    return role === 'SUPER_ADMIN' || role === 'SUPERADMIN';
  });

  filteredNotifications = computed(() => {
    let list = this.notificationService.notifications();
    const query = this.searchQuery.toLowerCase();
    
    if (this.filter() === 'UNREAD') {
      list = list.filter(n => !n.isRead);
    }

    if (query) {
      list = list.filter(n => 
        n.title.toLowerCase().includes(query) || 
        n.message.toLowerCase().includes(query)
      );
    }

    return list;
  });

  ngOnInit() {}

  handleClick(n: any) {
    if (!n.isRead) {
      this.notificationService.markAsRead(n.id);
    }

    if (n.actionUrl) {
      if (n.actionUrl.startsWith('/')) {
        this.router.navigateByUrl(n.actionUrl);
      } else {
        window.open(n.actionUrl, '_blank');
      }
    }
  }

  async confirmDeleteOne(id: string) {
    const result = await Swal.fire({
      title: '¿Eliminar notificación?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#CDD7D6',
      background: '#FAFCFB',
      color: '#1A3E3B'
    });

    if (result.isConfirmed) {
      this.notificationService.delete(id).subscribe({
        next: () => {
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Notificación eliminada',
            showConfirmButton: false,
            timer: 2000
          });
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: 'No se pudo eliminar la notificación. Inténtalo de nuevo.',
            confirmButtonColor: '#4A8E8A'
          });
        }
      });
    }
  }

  handleCleanupAction(selection: string) {
    this.showCleanup = false;
    this.confirmBulkDelete(selection);
  }

  async confirmBulkDelete(selection: string) {
    const isTotal = selection === 'all';
    const days = parseInt(selection);
    
    const result = await Swal.fire({
      title: isTotal ? '¿Borrar TODO el historial?' : `¿Borrar alertas de más de ${days} días?`,
      text: 'Esta acción eliminará los registros permanentemente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, proceder',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#CDD7D6',
      background: '#FAFCFB',
      color: '#1A3E3B'
    });

    if (result.isConfirmed) {
      const action = isTotal 
        ? this.notificationService.clearAll() 
        : this.notificationService.clearByRange(days);

      action.subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Limpieza completada',
            text: 'El historial ha sido actualizado.',
            timer: 2000,
            showConfirmButton: false
          });
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'Error de limpieza',
            text: 'Ocurrió un error al intentar limpiar el historial o el servidor no tiene permisos.',
            confirmButtonColor: '#4A8E8A'
          });
        }
      });
    }
  }
}
