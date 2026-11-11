import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MySubscriptionService, MySubscriptionPayment } from '../../../core/services/my-subscription.service';
import { LucideAngularModule, CreditCard, ChevronRight, CheckCircle, Clock, XCircle, FileText } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-subscription-history',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="subscription-page">
      <header class="page-header">
        <h1>Mi Suscripción</h1>
        <p>Gestiona tu plan y consulta tu historial de pagos</p>
      </header>

      <div class="subscription-content">
        <!-- Current Plan Summary -->
        <div class="current-plan-card glass-panel" *ngIf="authService.currentUser() as user">
           <div class="plan-info">
              <span class="label">Estado Actual</span>
              <div class="plan-title">
                <i-lucide name="credit-card" class="plan-icon"></i-lucide>
                <h2>Tu Business Suite está activa</h2>
              </div>
              <p class="expiry-info">Tu próximo vencimiento es el <strong>Próximamente</strong></p>
           </div>
           <button class="btn-upgrade">Mejorar Plan <i-lucide name="chevron-right"></i-lucide></button>
        </div>

        <!-- Payment History Table -->
        <section class="history-section">
          <h3>Historial de Pagos</h3>
          <div class="history-table glass-panel">
            <table class="zen-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Paquete</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Aprobado</th>
                  <th>Evidencia</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let p of history()">
                  <td>{{ p.createdAt | date:'dd/MM/yyyy' }}</td>
                  <td><strong>{{ p.package.name }}</strong></td>
                  <td>{{ p.amount | currency }}</td>
                  <td>
                    <span class="status-pill" [class]="p.status.toLowerCase()">
                      <i-lucide [name]="getStatusIcon(p.status)" class="status-icon"></i-lucide>
                      {{ getStatusLabel(p.status) }}
                    </span>
                  </td>
                  <td>{{ (p.approvedAt | date:'dd/MM/yyyy') || '-' }}</td>
                  <td>
                    <a *ngIf="p.evidenceUrl" [href]="p.evidenceUrl" target="_blank" class="link-btn">
                      <i-lucide name="file-text"></i-lucide> Ver
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>

            <div class="empty-state" *ngIf="history().length === 0">
               <p>Aún no tienes registros de pagos realizados.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .subscription-page { padding: 2rem; max-width: 1100px; margin: 0 auto; }
    .page-header { margin-bottom: 2.5rem; }
    .page-header h1 { font-family: 'Outfit', sans-serif; font-size: 2.2rem; color: #2D4A47; }
    .page-header p { color: #888; }

    .current-plan-card { padding: 32px; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #FFF 0%, #F0F7F6 100%); border: 1px solid #E1F3F1; margin-bottom: 3rem; }
    .plan-title { display: flex; align-items: center; gap: 12px; margin: 8px 0; }
    .plan-icon { color: #4A8E8A; }
    .plan-title h2 { font-family: 'Outfit', sans-serif; color: #2D4A47; font-size: 1.5rem; }
    .label { font-size: 0.75rem; text-transform: uppercase; color: #AAA; font-weight: 700; letter-spacing: 1px; }
    .expiry-info { color: #666; font-size: 0.95rem; }

    .btn-upgrade { background: #4A8E8A; color: white; border: none; padding: 14px 24px; border-radius: 12px; font-weight: 700; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: .3s; }
    .btn-upgrade:hover { transform: translateX(5px); box-shadow: 0 4px 15px rgba(74,142,138,0.2); }

    .history-section h3 { font-family: 'Outfit', sans-serif; font-size: 1.3rem; color: #2D4A47; margin-bottom: 1.5rem; }
    .history-table { overflow: hidden; background: white; }

    .zen-table { width: 100%; border-collapse: collapse; }
    .zen-table th { text-align: left; padding: 16px 24px; background: #FAFAFA; color: #888; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; }
    .zen-table td { padding: 18px 24px; border-bottom: 1px solid #F8F8F8; color: #555; }

    .status-pill { display: flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; width: fit-content; }
    .status-pill.pending { background: #FEF3C7; color: #D97706; }
    .status-pill.approved { background: #DCFCE7; color: #16A34A; }
    .status-pill.rejected { background: #FEE2E2; color: #DC2626; }
    .status-icon { width: 14px; height: 14px; }

    .link-btn { color: #4A8E8A; text-decoration: none; display: flex; align-items: center; gap: 4px; font-weight: 600; font-size: 0.9rem; }
    .link-btn:hover { text-decoration: underline; }

    .glass-panel { border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.02); }
    .empty-state { text-align: center; padding: 3rem; color: #AAA; }
  `]
})
export class SubscriptionHistoryComponent implements OnInit {
  private subService = inject(MySubscriptionService);
  authService = inject(AuthService);

  history = signal<MySubscriptionPayment[]>([]);

  ngOnInit() {
    this.subService.getHistory().subscribe(h => this.history.set(h));
  }

  getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'approved': return 'check-circle';
      case 'pending': return 'clock';
      case 'rejected': return 'x-circle';
      default: return 'help-circle';
    }
  }

  getStatusLabel(status: string): string {
    switch (status.toLowerCase()) {
      case 'approved': return 'Aprobado';
      case 'pending': return 'Pendiente';
      case 'rejected': return 'Rechazado';
      default: return status;
    }
  }
}
