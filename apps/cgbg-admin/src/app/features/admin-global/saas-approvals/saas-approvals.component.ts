import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  SuperAdminService,
  PendingSubscription,
  ProcessedSubscription,
} from '../../../core/services/super-admin.service';
import {
  LucideAngularModule,
  Check,
  X,
  ExternalLink,
  Image as ImageIcon,
  Search,
  AlertCircle,
  Calendar,
  CreditCard,
  RefreshCw,
  Filter,
  History,
  Clock,
  ChevronRight,
  Info,
  Package,
} from 'lucide-angular';
import { NotificationService } from '../../../core/services/notification.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-saas-approvals',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  template: `
    <div class="saas-approvals">
      <header class="page-header">
        <div class="header-content">
          <h1>Gestión de Suscripciones</h1>
          <p>Auditoría financiera y validación de cobros global</p>
        </div>

        <div class="tab-selector glass-panel">
          <button
            [class.active]="activeTab() === 'pending'"
            (click)="activeTab.set('pending')"
          >
            <i-lucide name="clock"></i-lucide>
            Pendientes
            <span class="count-pill" *ngIf="pending().length > 0">{{
              pending().length
            }}</span>
          </button>
          <button
            [class.active]="activeTab() === 'history'"
            (click)="activeTab.set('history')"
          >
            <i-lucide name="history"></i-lucide>
            Historial
          </button>
        </div>
      </header>

      <!-- PENDING TAB -->
      <div
        class="tab-content"
        *ngIf="activeTab() === 'pending'"
        [@fadeIn]
      >
        <div class="approvals-grid" [class.loading]="isRefreshing()">
          <div class="approval-card glass-panel" *ngFor="let p of pending()">
            <div class="card-main">
              <div class="card-left">
                <div class="tenant-header">
                  <div class="business-info">
                    <span class="business-name">{{ p.tenant.name }}</span>
                    <span class="plan-tag">{{ p.package.name }}</span>
                  </div>
                  <div class="request-date">
                    <i-lucide name="calendar" class="icon-xs"></i-lucide>
                    {{ p.createdAt | date : 'mediumDate' }}
                  </div>
                </div>

                <div class="payment-metrics">
                  <div class="metric">
                    <div class="metric-label">
                      <i-lucide name="credit-card" class="icon-xs"></i-lucide>
                      Monto Total
                    </div>
                    <div class="metric-value">
                      {{ p.amount | currency : 'MXN' }}
                    </div>
                  </div>
                  <div class="metric">
                    <div class="metric-label">
                      <i-lucide name="package" class="icon-xs"></i-lucide>
                      Vigencia
                    </div>
                    <div class="metric-value">
                      {{ p.monthsCount }}
                      {{ p.monthsCount === 1 ? 'Mes' : 'Meses' }}
                    </div>
                  </div>
                </div>

                <div class="evidence-preview">
                  <div class="no-image" *ngIf="!p.evidenceUrl">
                    <i-lucide name="image" class="icon-lg"></i-lucide>
                    <p>Sin comprobante adjunto</p>
                  </div>
                  <div *ngIf="p.evidenceUrl" class="image-container">
                    <img [src]="p.evidenceUrl" alt="Comprobante" />
                    <div class="image-actions">
                      <a
                        [href]="p.evidenceUrl"
                        target="_blank"
                        class="btn-view"
                      >
                        <i-lucide name="external-link"></i-lucide>
                        Ampliar
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div class="card-actions">
                <button
                   class="btn-detail-sm"
                   (click)="viewDetail(p)"
                >
                   <i-lucide name="info"></i-lucide>
                   Detalles
                </button>
                <div class="approval-btns">
                  <button
                    class="btn-reject"
                    (click)="reject(p)"
                    [disabled]="loadingId() === p.id"
                  >
                    <i-lucide name="x"></i-lucide>
                  </button>
                  <button
                    class="btn-approve"
                    (click)="approve(p)"
                    [disabled]="loadingId() === p.id"
                  >
                    <i-lucide name="check" *ngIf="loadingId() !== p.id"></i-lucide>
                    <i-lucide name="refresh-cw" class="spin" *ngIf="loadingId() === p.id"></i-lucide>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div
            class="empty-state glass-panel"
            *ngIf="pending().length === 0 && !isRefreshing()"
          >
            <div class="empty-icon-wrapper">
              <i-lucide name="check" class="check-icon"></i-lucide>
            </div>
            <h3>¡Todo al día!</h3>
            <p>No hay suscripciones esperando validación. Buen trabajo.</p>
          </div>
        </div>
      </div>

      <!-- HISTORY TAB -->
      <div
        class="tab-content"
        *ngIf="activeTab() === 'history'"
      >
        <div class="filter-bar glass-panel">
          <div class="search-box">
            <i-lucide name="search"></i-lucide>
            <input
              type="text"
              placeholder="Buscar por negocio..."
              [(ngModel)]="searchQuery"
            />
          </div>
          <div class="filter-actions">
            <select [(ngModel)]="statusFilter">
              <option value="ALL">Todos los estados</option>
              <option value="APPROVED">Aprobados</option>
              <option value="REJECTED">Rechazados</option>
            </select>
          </div>
        </div>

        <div class="history-list" [class.loading]="isRefreshing()">
          <div class="history-item glass-panel" *ngFor="let h of filteredHistory()">
            <div class="history-status" [class]="h.status.toLowerCase()">
              <i-lucide [name]="h.status === 'APPROVED' ? 'check' : 'x'"></i-lucide>
            </div>
            <div class="history-info">
              <div class="info-top">
                <span class="history-tenant">{{ h.tenant.name }}</span>
                <span class="history-date">{{ h.createdAt | date:'short' }}</span>
              </div>
              <div class="info-bottom">
                <span class="history-package">{{ h.package.name }}</span>
                <span class="history-amount">{{ h.amount | currency:'MXN' }}</span>
              </div>
            </div>
            <div class="history-actions">
               <button class="btn-detail" (click)="viewDetail(h)">
                  <i-lucide name="info"></i-lucide>
                  Ver Detalle
               </button>
            </div>
          </div>

          <div class="empty-state glass-panel" *ngIf="filteredHistory().length === 0 && !isRefreshing()">
            <div class="empty-icon-wrapper">
              <i-lucide name="search" class="check-icon"></i-lucide>
            </div>
            <h3>Sin resultados</h3>
            <p>No encontramos transacciones que coincidan con la búsqueda.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- SUBSCRIPTION DETAIL MODAL -->
    <div class="modal-overlay" *ngIf="selectedProcessed() as h" (click)="selectedProcessed.set(null)" [@fadeIn]>
      <div class="modal-card glass-panel" (click)="$event.stopPropagation()">
        <header class="modal-header">
           <div class="header-info">
              <span class="status-badge" [class]="h.status?.toLowerCase() || 'pending'">
                <i-lucide [name]="h.status === 'APPROVED' ? 'check' : (h.status === 'REJECTED' ? 'x' : 'clock')"></i-lucide>
                {{ h.status === 'APPROVED' ? 'Monto Aprobado' : (h.status === 'REJECTED' ? 'Pago Rechazado' : 'Validación Pendiente') }}
              </span>
              <h2>{{ h.tenant.name }}</h2>
              <p>ID Transacción: {{ h.id.slice(0, 8) }}</p>
           </div>
           <button class="btn-close" (click)="selectedProcessed.set(null)">
             <i-lucide name="x"></i-lucide>
           </button>
        </header>

        <div class="modal-body">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="label">Plan Contratado</span>
              <span class="value">{{ h.package.name }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Inversión Total</span>
              <span class="value highlighting">{{ h.amount | currency:'MXN' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Periodo</span>
              <span class="value">{{ h.monthsCount }} {{ h.monthsCount === 1 ? 'Mes' : 'Meses' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Fecha de Auditoría</span>
              <span class="value">{{ h.createdAt | date:'medium' }}</span>
            </div>
          </div>

          <!-- Reject or Admin Notes -->
          <div class="admin-notes" *ngIf="h.adminNotes">
             <div class="notes-header">
               <i-lucide name="alert-circle" class="icon-xs"></i-lucide>
               Observaciones de Administración
             </div>
             <p>{{ h.adminNotes }}</p>
          </div>

          <!-- Evidence Preview -->
          <div class="evidence-section" *ngIf="h.evidenceUrl">
            <span class="section-label">Evidencia de Pago</span>
            <div class="evidence-full">
               <img [src]="h.evidenceUrl" alt="Comprobante">
               <a [href]="h.evidenceUrl" target="_blank" class="btn-expand">
                 <i-lucide name="external-link"></i-lucide>
                 Ver en tamaño completo
               </a>
            </div>
          </div>
        </div>

        <footer class="modal-footer">
          <button class="btn-primary" (click)="selectedProcessed.set(null)">Cerrar Detalle</button>
        </footer>
      </div>
    </div>
  `,
  styles: [
    `
    .saas-approvals { padding: 2rem; max-width: 1000px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 3rem; }
    .page-header h1 { font-family: 'Outfit', sans-serif; font-size: 2.2rem; color: #1A3E3B; margin: 0; }
    .page-header p { color: #667; margin: 0.5rem 0 0 0; font-size: 1.05rem; }

    /* Tabs */
    .tab-selector { display: flex; padding: 6px; gap: 4px; background: rgba(255,255,255,0.6) !important; border: 1px solid rgba(74, 142, 138, 0.1); border-radius: 24px; }
    .tab-selector button { flex: 1; border: none; background: transparent; padding: 12px 18px; border-radius: 20px; font-weight: 700; font-size: 0.9rem; color: #667; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.3s; }
    .tab-selector button i-lucide { width: 16px; height: 16px; }
    .tab-selector button.active { background: #4A8E8A; color: white; box-shadow: 0 4px 12px rgba(74, 142, 138, 0.2); }
    .count-pill { background: #E57373; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 700; }

    /* Filter Bar */
    .filter-bar { display: flex; gap: 1.5rem; padding: 1.2rem 2rem; margin-bottom: 1.5rem; align-items: center; border: 1px solid rgba(74, 142, 138, 0.05); }
    .search-box { flex: 1; position: relative; display: flex; align-items: center; gap: 12px; color: #889; }
    .search-box input { border: none; background: transparent; width: 100%; font-size: 0.95rem; color: #1A3E3B; outline: none; }
    .filter-actions select { background: #F0F7F6; border: 1px solid #E1ECE9; padding: 8px 16px; border-radius: 12px; color: #4A8E8A; font-weight: 600; outline: none; }

    /* Grid & Cards */
    .approvals-grid { display: flex; flex-direction: column; gap: 2rem; }
    .approval-card { border: 1px solid #F0F5F2; }
    .card-main { display: flex; padding: 2.5rem; gap: 3rem; align-items: center; }
    .card-left { flex: 1; display: flex; flex-direction: column; gap: 1.5rem; }
    .tenant-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .business-name { font-size: 1.4rem; font-weight: 800; color: #1A3E3B; display: block; margin-bottom: 6px; }
    .plan-tag { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.2px; color: #4A8E8A; font-weight: 800; background: #E1F3F1; padding: 4px 12px; border-radius: 8px; }
    .request-date { font-size: 0.85rem; color: #99A; display: flex; align-items: center; gap: 6px; }

    .payment-metrics { display: flex; gap: 3rem; }
    .metric { display: flex; flex-direction: column; gap: 6px; }
    .metric-label { font-size: 0.75rem; color: #889; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px; }
    .metric-value { font-size: 1.2rem; font-weight: 700; color: #2D4A47; }

    .evidence-preview { width: 300px; height: 180px; background: #F8FBF9; border-radius: 20px; overflow: hidden; border: 2px dashed #E0EDE8; position: relative; }
    .image-container { height: 100%; width: 100%; position: relative; }
    .image-container img { width: 100%; height: 100%; object-fit: cover; transition: 0.5s; }
    .image-actions { position: absolute; inset: 0; background: rgba(26, 62, 59, 0.7); display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.3s; }
    .image-container:hover .image-actions { opacity: 1; }
    .btn-view { color: white; text-decoration: none; padding: 10px 20px; border: 1px solid rgba(255,255,255,0.3); border-radius: 12px; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 8px; backdrop-filter: blur(4px); }

    .btn-approve { background: #4A8E8A; color: white; border: none; padding: 12px; border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.3s; }
    .btn-approve:hover { background: #3d7571; transform: scale(1.05); }
    .btn-reject { background: #FFF; color: #E57373; border: 2px solid #FEE2E2; padding: 10px; border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.3s; }
    .btn-reject:hover { background: #FFF5F5; border-color: #E57373; transform: scale(1.05); }
    
    .approval-btns { display: flex; gap: 8px; }
    .btn-detail-sm { background: #F0F7F6; border: none; padding: 10px 16px; border-radius: 12px; color: #4A8E8A; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 0.85rem; transition: 0.3s; }
    .btn-detail-sm:hover { background: #E1F3F1; transform: translateY(-2px); }
    .btn-detail-sm i-lucide { width: 14px; height: 14px; }

    .status-badge.pending { background: #FFF8E1; color: #F57F17; }

    /* History Styles */
    .history-list { display: flex; flex-direction: column; gap: 12px; }
    .history-item { display: flex; align-items: center; padding: 1.5rem 2rem; gap: 1.5rem; transition: 0.3s; border: 1px solid transparent; }
    .history-item:hover { border-color: #4A8E8A22; transform: translateX(4px); background: white !important; }
    .history-status { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .history-status.approved { background: #E8F5E9; color: #2E7D32; }
    .history-status.rejected { background: #FFEBEE; color: #C62828; }
    .history-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .info-top { display: flex; justify-content: space-between; align-items: center; }
    .history-tenant { font-size: 1.1rem; font-weight: 700; color: #1A3E3B; }
    .history-date { font-size: 0.8rem; color: #99A; }
    .history-package { font-size: 0.85rem; color: #667; }
    .history-amount { font-size: 1rem; font-weight: 700; color: #4A8E8A; }
    .btn-detail { background: #F0F7F6; border: none; padding: 8px 16px; border-radius: 10px; color: #4A8E8A; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 0.85rem; }
    .empty-state { text-align: center; padding: 4rem 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.2rem; }
    .empty-icon-wrapper { width: 72px; height: 72px; background: rgba(74, 142, 138, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #4A8E8A; }
    .empty-state h3 { font-family: 'Outfit', sans-serif; font-size: 1.6rem; color: #1A3E3B; margin: 0; font-weight: 700; }
    .empty-state p { color: #667; margin: 0; font-size: 1.05rem; }
    .check-icon { width: 32px; height: 32px; }

    /* Modals */
    .modal-overlay { position: fixed; inset: 0; background: rgba(26, 62, 59, 0.4); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 2rem; }
    .modal-card { width: 100%; max-width: 600px; max-height: 90vh; background: white; border-radius: 32px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.15); }
    .modal-header { padding: 2rem; border-bottom: 1px solid #F0F5F2; display: flex; justify-content: space-between; align-items: flex-start; }
    .status-badge { display: inline-flex; align-items: center; gap: 8px; font-size: 0.75rem; font-weight: 800; padding: 6px 12px; border-radius: 100px; text-transform: uppercase; margin-bottom: 12px; }
    .status-badge.approved { background: #E8F5E9; color: #2E7D32; }
    .status-badge.rejected { background: #FFEBEE; color: #C62828; }
    .modal-header h2 { font-family: 'Outfit', sans-serif; font-size: 1.8rem; color: #1A3E3B; margin: 0; }
    .modal-header p { color: #99A; font-size: 0.85rem; margin-top: 4px; }
    .btn-close { background: none; border: none; color: #99A; cursor: pointer; padding: 4px; }

    .modal-body { padding: 2rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1.5rem; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; background: #FAFCFB; padding: 1.5rem; border-radius: 20px; }
    .detail-item { display: flex; flex-direction: column; gap: 4px; }
    .detail-item .label { font-size: 0.75rem; color: #889; font-weight: 700; text-transform: uppercase; }
    .detail-item .value { font-size: 1.05rem; font-weight: 700; color: #1A3E3B; }
    .detail-item .value.highlighting { color: #4A8E8A; font-size: 1.2rem; }

    .admin-notes { padding: 1.2rem; background: #FFF9F9; border-radius: 16px; border: 1px solid #FEE2E2; }
    .notes-header { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; font-weight: 800; color: #C62828; margin-bottom: 8px; }
    .admin-notes p { margin: 0; font-size: 0.95rem; color: #444; line-height: 1.5; }

    .evidence-section { display: flex; flex-direction: column; gap: 12px; }
    .section-label { font-size: 0.85rem; color: #889; font-weight: 700; }
    .evidence-full { position: relative; border-radius: 20px; overflow: hidden; border: 2px dashed #E0EDE8; }
    .evidence-full img { width: 100%; height: auto; max-height: 300px; object-fit: contain; background: #F8FBF9; }
    .btn-expand { position: absolute; bottom: 12px; right: 12px; background: rgba(26, 62, 59, 0.8); color: white; padding: 8px 16px; border-radius: 12px; font-size: 0.8rem; text-decoration: none; font-weight: 600; display: flex; align-items: center; gap: 8px; backdrop-filter: blur(4px); }

    .btn-primary { background: #4A8E8A; color: white; border: none; padding: 12px 24px; border-radius: 14px; font-weight: 700; cursor: pointer; transition: all 0.3s ease; }
    .btn-primary:hover { background: #3d7571; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(74, 142, 138, 0.2); }

    .modal-footer { padding: 1.5rem 2rem; border-top: 1px solid #F0F5F2; display: flex; justify-content: flex-end; }

    .glass-panel { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); border-radius: 28px; box-shadow: 0 4px 30px rgba(0,0,0,0.02); }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    @media (max-width: 768px) {
      .saas-approvals { padding: 1.25rem; }
      .page-header { flex-direction: column; gap: 1.5rem; align-items: stretch; margin-bottom: 2rem; }
      .page-header h1 { font-size: 1.8rem; }
      .tab-selector { width: 100%; }
      .card-main { padding: 1.5rem; flex-direction: column; gap: 1.5rem; }
      .payment-metrics { flex-direction: column; gap: 1rem; }
      .evidence-preview { width: 100%; height: 220px; }
      .card-actions { width: 100%; display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid #F0F5F2; }
      .history-item { padding: 1.25rem; flex-direction: column; align-items: flex-start; }
      .history-tenant { font-size: 1rem; }
      .history-actions { width: 100%; margin-top: 0.5rem; }
      .btn-detail { width: 100%; justify-content: center; }
    }
    `,
  ],
})
export class SaasApprovalsComponent implements OnInit {
  private saasService = inject(SuperAdminService);
  private notificationService = inject(NotificationService);

  activeTab = signal<'pending' | 'history'>('pending');
  pending = signal<PendingSubscription[]>([]);
  history = signal<ProcessedSubscription[]>([]);
  loadingId = signal<string | null>(null);
  isRefreshing = signal(false);

  // Selected subscription for modal
  selectedProcessed = signal<any | null>(null);

  // Filter signals
  searchQuery = signal('');
  statusFilter = signal<'ALL' | 'APPROVED' | 'REJECTED'>('ALL');

  filteredHistory = computed(() => {
    const data: ProcessedSubscription[] = this.history();
    const query = this.searchQuery().toLowerCase();
    const status = this.statusFilter();

    return data.filter((h: ProcessedSubscription) => {
      const matchesSearch = h.tenant.name.toLowerCase().includes(query);
      const matchesStatus = status === 'ALL' || h.status === status;
      return matchesSearch && matchesStatus;
    });
  });

  ngOnInit() {
    this.refresh();
    this.loadHistory();
  }

  refresh() {
    this.isRefreshing.set(true);
    this.saasService.getPendingSubscriptions().subscribe({
      next: (p) => {
        this.pending.set(p);
        this.isRefreshing.set(false);
      },
      error: () => {
        this.notificationService.error(
          'Error',
          'No se pudo cargar la cola de aprobaciones.',
        );
        this.isRefreshing.set(false);
      },
    });
  }

  loadHistory() {
    this.saasService.getProcessedHistory().subscribe({
      next: (h) => this.history.set(h),
      error: () => console.error('Error loading history'),
    });
  }

  async approve(p: PendingSubscription) {
    const confirm = await this.notificationService.confirm(
      `¿Aprobar pago de ${p.tenant.name}?`,
      `Se activarán ${p.monthsCount} meses del plan ${p.package.name}.`,
      'info',
    );

    if (confirm) {
      this.loadingId.set(p.id);
      this.saasService.approveSubscription(p.id).subscribe({
        next: () => {
          this.notificationService.success(
            '¡Pago Aprobado!',
            'La suscripción ha sido activada y el cliente notificado.',
          );
          this.loadingId.set(null);
          this.refresh();
          this.loadHistory();
        },
        error: (err: any) => {
          this.notificationService.error(
            'Error',
            err.error?.message || 'No se pudo aprobar el pago.',
          );
          this.loadingId.set(null);
        },
      });
    }
  }

  async reject(p: PendingSubscription) {
    const { value: reason } = await (this.notificationService as any).swal.fire({
      title: 'Rechazar Comprobante',
      text: `Indica el motivo del rechazo para ${p.tenant.name}:`,
      input: 'textarea',
      inputPlaceholder:
        'Ej: El comprobante está borroso o el monto no coincide...',
      showCancelButton: true,
      confirmButtonText: 'Rechazar Pago',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#E57373',
      inputValidator: (value: string) => {
        if (!value) return 'Debes proporcionar un motivo para el rechazo.';
        return null;
      },
    });

    if (reason) {
      this.loadingId.set(p.id);
      this.saasService.rejectSubscription(p.id, reason).subscribe({
        next: () => {
          this.notificationService.success(
            'Pago Rechazado',
            'Se ha notificado al Merchant sobre el problema.',
          );
          this.loadingId.set(null);
          this.refresh();
          this.loadHistory();
        },
        error: () => {
          this.notificationService.error(
            'Error',
            'No se pudo procesar el rechazo.',
          );
          this.loadingId.set(null);
        },
      });
    }
  }

  viewDetail(h: any) {
    this.selectedProcessed.set(h);
  }
}
