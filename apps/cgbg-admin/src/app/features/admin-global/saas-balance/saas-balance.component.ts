import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, PercentPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuperAdminService } from '../../../core/services/super-admin.service';
import { 
  LucideAngularModule, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Server, 
  Calendar, 
  Target, 
  Zap, 
  Info, 
  Plus, 
  Trash2, 
  Edit3,
  CheckCircle,
  AlertCircle,
  Clock,
  Briefcase
} from 'lucide-angular';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-saas-balance',
  standalone: true,
  imports: [
    CommonModule, 
    LucideAngularModule, 
    BaseChartDirective, 
    FormsModule,
    CurrencyPipe,
    PercentPipe,
    DatePipe
  ],
  template: `
    <div class="saas-balance fade-in-up">
      <header class="page-header">
        <div class="header-content">
          <div class="title-group">
            <h1>Master Balance & Rentabilidad</h1>
            <p>Control Estratégico de Salud Financiera y Gestión de Capital</p>
          </div>
          <button class="btn-primary" (click)="openAddModal()">
            <i-lucide name="plus" class="icon-sm"></i-lucide>
            Nuevo Gasto de Infraestructura
          </button>
        </div>
      </header>

      <div class="financial-grid" *ngIf="healthData() as data">
        <!-- Main Stats -->
        <div class="stats-row">
          <div class="stat-card glass" *ngFor="let stat of mainStats(data)">
            <div class="stat-icon" [style.background]="stat.bg">
              <i-lucide [name]="stat.icon" [style.color]="stat.color"></i-lucide>
            </div>
            <div class="stat-info">
              <span class="label">{{ stat.label }}</span>
              <div class="val-group">
                <h2 class="value">{{ stat.value }}</h2>
                <span class="sub-label" [ngClass]="stat.trendClass" *ngIf="stat.sub">
                  {{ stat.sub }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="bi-layout">
          <!-- Financial Advisor & Strategy -->
          <div class="advisor-section">
            <div class="advisor-card glass" [ngClass]="data.advisor.color">
              <div class="advisor-header">
                <div class="badge">
                  <i-lucide [name]="advisorIcon(data.advisor.status)" class="icon-sm"></i-lucide>
                  Asistente Financiero
                </div>
                <span class="status-tag">Estado: {{ data.advisor.status }}</span>
              </div>
              
              <div class="advisor-content">
                <h3>{{ data.advisor.message }}</h3>
                
                <div class="recommendations">
                  <div class="rec-item">
                    <span class="rec-label">Sueldo Personal Sugerido</span>
                    <div class="rec-value">{{ data.advisor.recommendedSalary }}</div>
                    <div class="progress-bg"><div class="fill" [style.width]="data.advisor.recommendedSalary"></div></div>
                  </div>
                  <div class="rec-item">
                    <span class="rec-label">Capitalización Mínima</span>
                    <div class="rec-value">{{ data.advisor.recommendedCapital }}</div>
                    <div class="progress-bg"><div class="fill" [style.width]="data.advisor.recommendedCapital"></div></div>
                  </div>
                </div>

                <div class="runway-insight">
                  <div class="runway-header">
                    <span>Proyección de Runway</span>
                    <span class="months">{{ data.advisor.runwayText }} Garantizados</span>
                  </div>
                  <div class="runway-bar">
                    <div class="runway-fill" [style.width.%]="(data.metrics.runwayMonths / 24) * 100"></div>
                  </div>
                  <p class="runway-desc">Basado en liquidez actual vs costos fijos mensuales.</p>
                </div>
              </div>

              <footer class="advisor-footer">
                <i-lucide name="zap" class="icon-xs"></i-lucide>
                <span>Sugerencia: {{ getStrategySuggestion(data.metrics) }}</span>
              </footer>
            </div>

            <!-- Strategy Targets -->
            <div class="strategy-card glass">
               <h3>Meta de Punto de Equilibrio</h3>
               <div class="target-list">
                 <div class="target-item" *ngFor="let pkg of packages()">
                    <div class="pkg-info">
                       <span class="pkg-name">{{ pkg.name }}</span>
                       <span class="pkg-price">{{ pkg.price | currency }} / mes</span>
                    </div>
                    <div class="pkg-goal">
                       <span class="needed">{{ calculateNeeded(pkg.price, data.metrics.totalMonthlyCost) }}</span>
                       <span class="ref">Suscripciones</span>
                    </div>
                 </div>
               </div>
               <p class="helper-text">Número de clientes activos necesarios en cada plan para cubrir el 100% de los gastos actuales.</p>
            </div>
          </div>

          <!-- Expenses List -->
          <div class="expenses-section glass">
            <div class="section-header">
               <h3>Gastos de Infraestructura</h3>
               <span class="count">{{ data.expenses.length }} Servicios activos</span>
            </div>
            
            <div class="zen-responsive-table">
              <table class="modern-table">
                <thead>
                  <tr>
                    <th>Servicio / Categoría</th>
                    <th>Costo Mensual</th>
                    <th>Día de Pago</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let exp of data.expenses" class="expense-row">
                    <td>
                      <div class="exp-name">
                        <strong class="service-title">{{ exp.name }}</strong>
                        <div class="cat-wrapper">
                          <span class="cat-badge" [ngClass]="exp.category.toLowerCase()">{{ exp.category }}</span>
                        </div>
                        <span class="service-desc">{{ exp.description || 'Sin descripción' }}</span>
                      </div>
                    </td>
                    <td><span class="price">{{ exp.monthlyCost | currency }}</span></td>
                    <td>
                      <div class="due-cell" *ngIf="exp.dueDay">
                        <i-lucide name="calendar" class="icon-xs"></i-lucide>
                        Día {{ exp.dueDay }}
                      </div>
                      <span *ngIf="!exp.dueDay" class="muted">-</span>
                    </td>
                    <td>
                      <span class="status-dot" [class.active]="exp.isActive"></span>
                      {{ exp.isActive ? 'Activo' : 'Pausado' }}
                    </td>
                    <td>
                      <div class="actions">
                        <button class="btn-icon" (click)="editExpense(exp)"><i-lucide name="edit-3"></i-lucide></button>
                        <button class="btn-icon delete" (click)="deleteExpense(exp.id)"><i-lucide name="trash-2"></i-lucide></button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Add/Edit Modal (Simple native style for first iteration) -->
      <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
        <div class="modal-card glass" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <h3>{{ isEditing ? 'Editar Gasto' : 'Nuevo Gasto de Infraestructura' }}</h3>
            <button class="btn-close" (click)="closeModal()">×</button>
          </header>
          
          <form (submit)="saveExpense($event)" class="expense-form">
            <div class="form-group">
              <label>Nombre del Servicio</label>
              <input type="text" [(ngModel)]="currentExpense.name" name="name" placeholder="Ej. VPS Contabo, AWS S3" required>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Costo Mensual (USD)</label>
                <div class="input-icon">
                  <span>$</span>
                  <input type="number" [(ngModel)]="currentExpense.monthlyCost" name="cost" step="0.01" required>
                </div>
              </div>
              <div class="form-group">
                <label>Día de Pago (1-31)</label>
                <input type="number" [(ngModel)]="currentExpense.dueDay" name="day" min="1" max="31">
              </div>
            </div>
            <div class="form-group">
              <label>Categoría</label>
              <select [(ngModel)]="currentExpense.category" name="category">
                <option value="INFRASTRUCTURE">Infraestructura</option>
                <option value="EMAIL">Correo Electrónico</option>
                <option value="STORAGE">Almacenamiento</option>
                <option value="SOCIAL">Marketing/Social</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>
            <div class="form-group">
              <label>Descripción</label>
              <textarea [(ngModel)]="currentExpense.description" name="desc" rows="3"></textarea>
            </div>
            
            <footer class="form-actions">
              <button type="button" class="btn-secondary" (click)="closeModal()">Cancelar</button>
              <button type="submit" class="btn-primary" [disabled]="!currentExpense.name || currentExpense.monthlyCost === null || currentExpense.monthlyCost === undefined">
                {{ isEditing ? 'Actualizar' : 'Registrar Gasto' }}
              </button>
            </footer>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .saas-balance { padding: 2.5rem; max-width: 1400px; margin: 0 auto; color: #1A3E3B; background: #FAFCFB; min-height: 100vh; }
    
    .page-header { margin-bottom: 3rem; }
    .header-content { display: flex; justify-content: space-between; align-items: flex-end; }
    .title-group h1 { font-family: 'Outfit', sans-serif; font-size: 2.8rem; font-weight: 800; margin: 0; letter-spacing: -0.02em; }
    .title-group p { font-size: 1.15rem; color: #667A78; margin: 5px 0 0 0; }

    /* Button Styles */
    .btn-primary { background: #4A8E8A; color: white; padding: 12px 24px; border-radius: 14px; border: none; font-weight: 700; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    .btn-primary:hover { background: #3d7572; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(74,142,138,0.25); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

    /* Stats Grid */
    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .stat-card { display: flex; align-items: center; gap: 1.5rem; padding: 2rem; border-radius: 28px; }
    .stat-icon { width: 64px; height: 64px; border-radius: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .stat-info { flex: 1; min-width: 0; }
    .label { font-size: 0.85rem; font-weight: 800; text-transform: uppercase; color: #8C9C9A; letter-spacing: 0.05em; }
    .value { font-family: 'Outfit', sans-serif; font-size: 2.2rem; font-weight: 800; margin: 5px 0; }
    .sub-label { font-size: 0.9rem; font-weight: 700; padding: 4px 12px; border-radius: 100px; display: inline-block; }
    .trend-up { background: rgba(34, 197, 94, 0.1); color: #16A34A; }
    .trend-down { background: rgba(239, 68, 68, 0.1); color: #DC2626; }

    /* BI Layout */
    .bi-layout { display: grid; grid-template-columns: 400px 1fr; gap: 2rem; }
    
    .advisor-section { display: flex; flex-direction: column; gap: 1.5rem; }
    
    /* Advisor Card */
    .advisor-card { padding: 2.5rem; border-radius: 32px; border: 2px solid transparent; }
    .advisor-card.red { border-color: #FCA5A5; background: linear-gradient(135deg, white, #FFF5F5); }
    .advisor-card.orange { border-color: #FDBA74; background: linear-gradient(135deg, white, #FFF7ED); }
    .advisor-card.teal { border-color: #99F6E4; background: linear-gradient(135deg, white, #F0FDFA); }
    .advisor-card.green { border-color: #86EFAC; background: linear-gradient(135deg, white, #F0FDF4); }

    .advisor-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
    .badge { display: flex; align-items: center; gap: 8px; font-weight: 800; color: #4A8E8A; font-size: 0.85rem; text-transform: uppercase; }
    .status-tag { font-size: 0.75rem; font-weight: 700; color: #667A78; }

    .advisor-content h3 { font-family: 'Outfit', sans-serif; font-size: 1.3rem; line-height: 1.4; margin-bottom: 2rem; color: #1A3330; }
    
    .recommendations { display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 2.5rem; }
    .rec-item { display: flex; flex-direction: column; gap: 8px; }
    .rec-label { font-size: 0.85rem; font-weight: 700; color: #667A78; }
    .rec-value { font-size: 1.2rem; font-weight: 800; color: #1A3E3B; }
    .progress-bg { height: 10px; background: rgba(0,0,0,0.05); border-radius: 10px; overflow: hidden; }
    .progress-bg .fill { height: 100%; background: #4A8E8A; border-radius: 10px; }

    .runway-insight { background: rgba(0,0,0,0.03); padding: 20px; border-radius: 20px; }
    .runway-header { display: flex; justify-content: space-between; font-weight: 800; font-size: 0.9rem; margin-bottom: 12px; }
    .runway-header .months { color: #4A8E8A; }
    .runway-bar { height: 6px; background: white; border-radius: 10px; margin-bottom: 12px; }
    .runway-fill { height: 100%; background: #4ADE80; border-radius: 10px; box-shadow: 0 0 10px rgba(74, 222, 128, 0.5); }
    .runway-desc { font-size: 0.8rem; color: #889; margin: 0; }

    .advisor-footer { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid rgba(0,0,0,0.05); display: flex; align-items: center; gap: 10px; font-size: 0.9rem; font-weight: 600; color: #4A8E8A; }

    /* Strategy Card */
    .strategy-card { padding: 2rem; border-radius: 32px; }
    .strategy-card h3 { font-family: 'Outfit', sans-serif; font-size: 1.4rem; margin-bottom: 1.5rem; }
    .target-list { display: flex; flex-direction: column; gap: 1rem; }
    .target-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-radius: 16px; background: #F8FAFA; border: 1px solid #EEF2F1; }
    .pkg-name { display: block; font-weight: 800; font-size: 0.9rem; color: #1A3E3B; }
    .pkg-price { font-size: 0.8rem; color: #889; font-weight: 600; }
    .needed { font-weight: 900; font-size: 1.6rem; color: #4A8E8A; display: block; text-align: right; }
    .pkg-goal .ref { font-size: 0.7rem; color: #AAA; text-transform: uppercase; font-weight: 800; display: block; }
    .helper-text { font-size: 0.8rem; color: #889; margin-top: 1.5rem; line-height: 1.5; }

    /* Expenses Section */
    .expenses-section { padding: 2.5rem; border-radius: 32px; flex: 1; min-width: 0; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
    .section-header h3 { font-family: 'Outfit', sans-serif; font-size: 1.6rem; margin: 0; }
    .section-header span.count { color: #889; font-weight: 700; font-size: 0.95rem; }

    .expenses-table-wrapper { overflow-x: auto; }
    .modern-table { width: 100%; border-collapse: separate; border-spacing: 0 10px; }
    .modern-table th { padding: 15px; text-align: left; font-size: 0.8rem; font-weight: 800; color: #8C9C9A; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #F0F4F3; }
    .expense-row td { padding: 15px; background: white; transition: background 0.2s, transform 0.2s; }
    .expense-row td:first-child { border-top-left-radius: 16px; border-bottom-left-radius: 16px; width: 350px; }
    .expense-row td:last-child { border-top-right-radius: 16px; border-bottom-right-radius: 16px; min-width: 120px; }
    .expense-row:hover td { transform: scale(1.005); background: #FDFEFE; }

    .service-title { display: block; color: #1A3E3B; font-size: 1.05rem; margin-bottom: 4px; }
    .cat-wrapper { margin-bottom: 6px; }
    .service-desc { font-size: 0.85rem; color: #889; font-weight: 500; display: block; line-height: 1.4; }
    .cat-badge { font-size: 0.75rem; font-weight: 800; padding: 4px 12px; border-radius: 100px; display: inline-block; }
    .cat-badge.infrastructure { color: #6366F1; background: #EEF2FF; }
    .cat-badge.email { color: #F59E0B; background: #FFFBEB; }
    .cat-badge.storage { color: #10B981; background: #ECFDF5; }
    .cat-badge.social { color: #EC4899; background: #FDF2F8; }
    .cat-badge.other { color: #6B7280; background: #F3F4F6; }

    .price { font-weight: 800; color: #1A3E3B; font-size: 1.1rem; }
    .due-cell { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.85rem; color: #4A8E8A; }
    
    .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #CBD5E1; margin-right: 6px; }
    .status-dot.active { background: #22C55E; box-shadow: 0 0 8px rgba(34, 197, 94, 0.4); }

    .actions { display: flex; gap: 8px; }
    .btn-icon { width: 36px; height: 36px; border-radius: 10px; border: none; background: #F0F4F3; color: #667A78; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
    .btn-icon:hover { background: #4A8E8A; color: white; }
    .btn-icon.delete:hover { background: #EF4444; }

    /* Modal Styles */
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(26, 62, 59, 0.4); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-card { width: 500px; padding: 2.5rem; border-radius: 32px; box-shadow: 0 30px 60px rgba(0,0,0,0.15); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
    .modal-header h3 { font-family: 'Outfit', sans-serif; font-size: 1.8rem; margin: 0; }
    .btn-close { border: none; background: none; font-size: 2rem; color: #889; cursor: pointer; }

    .expense-form { display: flex; flex-direction: column; gap: 1.5rem; }
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-group label { font-size: 0.85rem; font-weight: 700; color: #667A78; }
    .form-group input, .form-group select, .form-group textarea { padding: 14px; border-radius: 12px; border: 1.5px solid #EEF2F1; background: #FAFCFB; font-family: inherit; font-size: 0.95rem; transition: all 0.2s; }
    .form-group input:focus { outline: none; border-color: #4A8E8A; background: white; box-shadow: 0 0 0 4px rgba(74,142,138,0.1); }
    
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .input-icon { position: relative; }
    .input-icon span { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-weight: 700; color: #889; }
    .input-icon input { padding-left: 30px; width: 100%; }

    .form-actions { margin-top: 1rem; display: flex; justify-content: flex-end; gap: 1rem; }
    .btn-secondary { background: #F0F4F3; color: #445; padding: 12px 24px; border-radius: 12px; border: none; font-weight: 700; cursor: pointer; }

    /* Transitions */
    .fade-in-up { animation: fadeInUp 0.5s ease-out; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

    .glass { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.5); box-shadow: 0 10px 40px rgba(0,0,0,0.02); }
    
    @media (max-width: 1100px) {
      .bi-layout { grid-template-columns: 1fr; }
      .advisor-section { flex-direction: column; }
    }

    @media (max-width: 768px) {
      .saas-balance { padding: 1.25rem; }
      .header-content { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
      .title-group h1 { font-size: 2rem; }
      
      .stats-row { grid-template-columns: 1fr; gap: 1rem; }
      .stat-card { padding: 1.25rem; }
      
      .advisor-card { padding: 1.5rem; }
      .advisor-header { flex-direction: column; gap: 0.75rem; align-items: flex-start; }
      .runway-header { flex-direction: column; gap: 0.5rem; align-items: flex-start; }
      
      .modal-card { width: 95%; padding: 1.5rem; border-radius: 20px; }
      .form-row { grid-template-columns: 1fr; }

      .section-header { flex-direction: column; align-items: flex-start; gap: 8px; }
      .section-header h3 { font-size: 1.75rem; }
      .section-header span.count { font-size: 0.85rem; color: #4A8E8A; }

      .expense-row:hover td { transform: none; }
      .expense-row td:first-child { width: 280px; }
    }
  `]
})
export class SaasBalanceComponent implements OnInit {
  private saasService = inject(SuperAdminService);
  healthData = signal<any>(null);
  packages = signal<any[]>([]);
  
  showModal = false;
  isEditing = false;
  currentExpense: any = { category: 'INFRASTRUCTURE', monthlyCost: 0 };

  ngOnInit() {
    this.loadData();
    this.saasService.getPackages().subscribe(pkgs => this.packages.set(pkgs));
  }

  loadData() {
    this.saasService.getFinancialHealth().subscribe(data => {
      this.healthData.set(data);
    });
  }

  mainStats(data: any) {
    return [
      { label: 'Costo Operativo Mensual', value: `$${data.metrics.totalMonthlyCost.toLocaleString()}`, bg: '#FFF5F5', color: '#EF4444', icon: 'server', sub: 'Inversión fija', trendClass: 'trend-down' },
      { label: 'Ingresos Mensuales (MRR)', value: `$${data.metrics.mrr.toLocaleString()}`, bg: '#F0FDF4', color: '#22C55E', icon: 'zap', sub: 'Recurrente real', trendClass: 'trend-up' },
      { label: 'Margen de Beneficio', value: `${data.metrics.profitabilityMargin.toFixed(1)}%`, bg: '#F0FDFA', color: '#0D9488', icon: 'trending-up', sub: data.metrics.netProfit >= 0 ? 'Ganancia Neta' : 'Bajo Punto de Gasto' },
      { label: 'Saldo Total (Liquidez)', value: `$${data.metrics.totalLiquidity.toLocaleString()}`, bg: '#EFF6FF', color: '#2563EB', icon: 'dollar-sign', sub: 'Caja disponible' }
    ];
  }

  advisorIcon(status: string): any {
    switch (status) {
      case 'EXCELLENT':
      case 'STABLE': 
        return 'check-circle';
      case 'CRITICAL': 
        return 'alert-circle';
      case 'GROWTH': 
        return 'trending-up';
      case 'STARTING':
        return 'clock';
      default: return 'info';
    }
  }

  getStrategySuggestion(metrics: any): string {
    if (metrics.netProfit < 0) return 'Foco en adquisición de clientes para alcanzar rentabilidad.';
    if (metrics.runwayMonths < 12) return 'Aumentar reserva de capital para cubrir 1 año de operación.';
    return 'Optimizar costos o invertir en escalabilidad del negocio.';
  }

  calculateNeeded(price: number, totalCost: number): number {
    if (!price || !totalCost) return 0;
    return Math.ceil(totalCost / price);
  }

  // CRUD Actions
  openAddModal() {
    this.isEditing = false;
    this.currentExpense = { category: 'INFRASTRUCTURE', monthlyCost: 0 };
    this.showModal = true;
  }

  editExpense(exp: any) {
    this.isEditing = true;
    this.currentExpense = { ...exp };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  saveExpense(event: Event) {
    event.preventDefault();
    
    // Al guardar o editar, limpiamos el objeto para enviar solo los campos permitidos por el DTO del backend
    const { id, createdAt, updatedAt, startDate, ...rawData } = this.currentExpense;
    
    // Mapeamos explícitamente solo los campos que espera el backend
    const expenseData = {
      name: rawData.name,
      category: rawData.category,
      monthlyCost: rawData.monthlyCost,
      dueDay: rawData.dueDay,
      description: rawData.description,
      isActive: rawData.isActive ?? true
    };
    
    const action = this.isEditing 
      ? this.saasService.updateExpense(id, expenseData)
      : this.saasService.createExpense(expenseData);

    action.subscribe({
      next: () => {
        Swal.fire({
          title: this.isEditing ? '¡Actualizado!' : '¡Registrado!',
          text: `El gasto se ha ${this.isEditing ? 'actualizado' : 'registrado'} con éxito.`,
          icon: 'success',
          confirmButtonColor: '#4A8E8A',
          timer: 2000
        });
        this.loadData();
        this.closeModal();
      },
      error: (err) => {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo procesar la solicitud. Verifica los datos.',
          icon: 'error',
          confirmButtonColor: '#EF4444'
        });
        console.error('Error saving expense:', err);
      }
    });
  }

  deleteExpense(id: string) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción afectará tus métricas de rentabilidad actuales.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#8C9C9A',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#FAFCFB'
    }).then((result) => {
      if (result.isConfirmed) {
        this.saasService.deleteExpense(id).subscribe({
          next: () => {
            Swal.fire({
              title: 'Eliminado',
              text: 'Gasto removido exitosamente.',
              icon: 'success',
              timer: 1500,
              showConfirmButton: false
            });
            this.loadData();
          },
          error: () => {
            Swal.fire('Error', 'No se pudo eliminar el registro.', 'error');
          }
        });
      }
    });
  }
}
