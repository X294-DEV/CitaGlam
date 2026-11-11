import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { SuperAdminService, TenantStats, Package } from '../../../core/services/super-admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { firstValueFrom, Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { 
  LucideAngularModule, 
  Building, 
  Search, 
  Plus,
  X,
  User,
  Mail,
  Tag,
  MoreVertical, 
  Shield, 
  ShieldOff, 
  ExternalLink,
  Edit2,
  Power,
  RefreshCw
} from 'lucide-angular';

@Component({
  selector: 'app-saas-tenants',
  standalone: true,
  imports: [
    CommonModule, 
    LucideAngularModule, 
    FormsModule, 
    ReactiveFormsModule
  ],
  template: `
    <div class="saas-tenants">
      <header class="page-header">
        <div class="header-content">
          <h1>Gestión de Negocios</h1>
          <p>Directorio global de tenants en la plataforma</p>
        </div>
        <div class="header-actions">
           <div class="search-box">
             <i-lucide name="search" class="search-icon"></i-lucide>
             <input type="text" 
                    [ngModel]="searchTerm()" 
                    (ngModelChange)="searchTerm.set($event)" 
                    placeholder="Buscar por nombre o slug...">
           </div>
           <button class="btn-primary" (click)="openCreateModal()">
             <i-lucide name="plus"></i-lucide>
             Nuevo Negocio
           </button>
        </div>
      </header>

      <div class="tenants-list glass-panel" *ngIf="!isLoading()">
        <div class="zen-responsive-table">
          <table class="zen-table">
          <thead>
            <tr>
              <th>Negocio</th>
              <th>Usuarios/Suc.</th>
              <th>Plan Actual</th>
              <th>Vencimiento</th>
              <th class="text-center">Estado</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let t of filteredTenants()">
              <td>
                <div class="tenant-cell">
                  <div class="tenant-avatar">
                    <i-lucide name="building"></i-lucide>
                  </div>
                  <div class="tenant-info">
                    <span class="name">{{ t.name }}</span>
                    <span class="slug">/{{ t.slug }}</span>
                  </div>
                </div>
              </td>
              <td>
                <div class="count-badges">
                  <span class="badge gray">U: {{ t._count.users }}</span>
                  <span class="badge gray">S: {{ t._count.branches }}</span>
                </div>
              </td>
              <td>
                <span class="package-name">{{ t.package.name }}</span>
              </td>
              <td>
                <div class="date-cell">
                  <span class="expiry-date" [class.urgent]="isCloseToExpiry(t.subscriptionExpiresAt)">
                    {{ t.subscriptionExpiresAt | date:'dd/MM/yyyy' }}
                  </span>
                </div>
              </td>
              <td>
                <span class="status-pill" [class.active]="t.isActive" [class.suspended]="!t.isActive">
                  {{ t.isActive ? 'Activo' : 'Suspendido' }}
                </span>
              </td>
              <td class="actions-cell">
                <div class="actions-group">
                  <button class="action-btn edit" (click)="editTenant(t)" title="Editar Merchant">
                    <i-lucide name="edit-2"></i-lucide>
                  </button>
                  <button class="action-btn status" 
                          [class.suspend]="t.isActive" 
                          [class.activate]="!t.isActive"
                          (click)="toggleStatus(t)" 
                          [title]="t.isActive ? 'Suspender Merchant' : 'Activar Merchant'">
                    <i-lucide [name]="t.isActive ? 'shield-off' : 'shield'"></i-lucide>
                  </button>
                  <button class="action-btn resend" 
                          *ngIf="t.isPending"
                          (click)="resendInvitation(t)" 
                          title="Reenviar Invitación de Acceso">
                    <i-lucide name="mail"></i-lucide>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
          </table>
        </div>

        <!-- Empty state -->
        <div class="empty-state" *ngIf="filteredTenants().length === 0">
           <p>No se encontraron negocios con ese criterio.</p>
        </div>
      </div>

      <div class="loading-state" *ngIf="isLoading()">
        <div class="spinner"></div>
        <p>Cargando directorio de negocios...</p>
      </div>

      <!-- Modal de Creación -->
      <div class="modal-overlay" *ngIf="showModal()" (click)="closeModal()">
        <div class="modal-card glass-panel" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="header-labels">
              <h2>{{ isEditing() ? 'Editar Negocio' : 'Alta Express de Negocio' }}</h2>
              <p>{{ isEditing() ? 'Actualiza los parámetros operativos del merchant' : 'Registro atómico de negocio, administrador y pago inicial' }}</p>
            </div>

            <button class="btn-close" (click)="closeModal()">
              <i-lucide name="x"></i-lucide>
            </button>
          </div>

          <form [formGroup]="tenantForm" (ngSubmit)="saveTenant()" class="modal-body">
            <div class="form-section">
              <div class="section-badge"><i-lucide name="building" class="icon-xs"></i-lucide> Datos del Merchant</div>
              <div class="form-grid">
                <div class="form-group">
                  <label>Nombre del Negocio</label>
                  <input type="text" formControlName="name" placeholder="Ej: Barbería Don Pepe">
                </div>
                <div class="form-group">
                  <label>Slug (URL única)</label>
                  <div class="slug-input" [class.disabled]="isEditing()">
                    <span class="prefix">cgbg.app/</span>
                    <input type="text" formControlName="slug" [placeholder]="isEditing() ? '' : 'barberia-pepe'">
                  </div>
                  <p class="help-text warning" *ngIf="isEditing()">El slug es permanente por seguridad de las URLs.</p>
                </div>
              </div>
            </div>

            <div class="form-section">
              <div class="section-badge"><i-lucide name="tag" class="icon-xs"></i-lucide> Plan y Vigencia</div>
              <div class="form-grid">
                <div class="form-group" [class.full]="!isExpressMode()">
                  <label>Seleccionar Paquete</label>
                  <select formControlName="packageId">
                    <option value="">Seleccione un plan...</option>
                    <option *ngFor="let p of packages()" [value]="p.id">{{ p.name }} - {{ p.price | currency }}</option>
                  </select>
                </div>

                <ng-container *ngIf="isExpressMode() && !isEditing()">
                  <div class="form-group">
                    <label>Plazo a Contratar</label>
                    <select formControlName="monthsCount">
                      <option *ngFor="let plazo of plazos" [value]="plazo">{{ plazo === 1 ? '1 Mes (Mensual)' : plazo + ' Meses' }}</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label>Monto a Cobrar (USD)</label>
                    <div class="amount-input">
                      <span class="curr">$</span>
                      <input type="number" formControlName="amount" step="0.01">
                    </div>
                    <p class="help-text suggested" *ngIf="suggestedAmount() > 0">Sugerido para el plazo: {{ suggestedAmount() | currency }}</p>
                  </div>

                  <div class="form-group">
                    <label>Vencimiento Estimado</label>
                    <div class="preview-box">
                       <i-lucide name="calendar" class="icon-xs"></i-lucide>
                       <span>{{ getExpiryPreview() | date:'dd/MM/yyyy' }}</span>
                    </div>
                  </div>
                </ng-container>
              </div>
            </div>

            <div class="form-section" *ngIf="!isEditing()">
              <div class="section-badge"><i-lucide name="user" class="icon-xs"></i-lucide> Administrador del Negocio</div>
              <div class="form-grid">
                <div class="form-group">
                  <label>Nombre(s)</label>
                  <input type="text" formControlName="adminFirstName" placeholder="Nombre completo">
                </div>
                <div class="form-group">
                  <label>Apellidos</label>
                  <input type="text" formControlName="adminLastName" placeholder="Apellidos">
                </div>
                <div class="form-group full">
                  <label>Correo Electrónico</label>
                  <input type="email" formControlName="adminEmail" placeholder="admin@negocio.com">
                  <p class="help-text">Se enviará un enlace de activación para configurar su contraseña.</p>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="closeModal()">Cancelar</button>
              <button type="submit" class="btn-primary" [disabled]="tenantForm.invalid || isSaving()">
                <span *ngIf="!isSaving()">{{ isEditing() ? 'Guardar Cambios' : 'Crear Negocio e Invitar' }}</span>
                <span *ngIf="isSaving()" class="loader-group">
                  <i-lucide name="refresh-cw" class="icon-xs spin"></i-lucide>
                  {{ isEditing() ? 'Actualizando...' : 'Procesando...' }}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .saas-tenants { padding: 2rem; max-width: 1400px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; }
    .page-header h1 { font-family: 'Outfit', sans-serif; font-size: 2.2rem; color: #2D4A47; margin: 0; }
    .page-header p { color: #888; margin: 4px 0 0 0; }

    .header-actions { display: flex; gap: 1rem; align-items: center; }
    .search-box { position: relative; display: flex; align-items: center; min-width: 320px; }
    .search-icon { position: absolute; left: 16px; color: #AAA; width: 18px; height: 18px; }
    .search-box input { width: 100%; padding: 12px 16px 12px 48px; border-radius: 14px; border: 1px solid #EEE; outline: none; background: #FFF; transition: .2s; font-size: 0.95rem; }
    .search-box input:focus { border-color: #4A8E8A; box-shadow: 0 0 0 4px rgba(74,142,138,0.1); }

    .btn-primary { background: #4A8E8A; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.3s ease; }
    .btn-primary:hover:not(:disabled) { background: #3d7571; transform: translateY(-2px); }
    .btn-primary:disabled { background: #CCC; cursor: not-allowed; }

    .btn-secondary { background: #F0F5F2; color: #4A8E8A; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.3s ease; }
    .btn-secondary:hover { background: #E0EDE8; }

    .tenants-list { background: white; border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.02); overflow: hidden; }
    .zen-table { width: 100%; border-collapse: separate; border-spacing: 0; }
    .zen-table th { text-align: left; padding: 16px 24px; color: #888; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #F0F0F0; }
    .zen-table td { padding: 20px 24px; border-bottom: 1px solid #F8F8F8; color: #444; }

    .tenant-cell { display: flex; align-items: center; gap: 14px; }
    .tenant-avatar { width: 44px; height: 44px; background: #F0F7F6; color: #4A8E8A; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
    .tenant-info { display: flex; flex-direction: column; }
    .tenant-info .name { font-weight: 700; color: #1A3E3B; font-size: 1rem; }
    .tenant-info .slug { font-size: 0.8rem; color: #AAA; font-family: 'Monaco', monospace; }

    .count-badges { display: flex; gap: 6px; }
    .badge.gray { background: #F5F7F8; color: #78909c; padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; }

    .package-name { font-weight: 700; color: #4A8E8A; font-size: 0.9rem; }

    .expiry-date { font-size: 0.9rem; color: #666; font-weight: 600; }
    .expiry-date.urgent { color: #E57373; border-bottom: 2px solid #FFEBEE; }

    .status-pill { padding: 6px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; background: #E1F3F1; color: #4A8E8A; }
    .status-pill.suspended { background: #FEE2E2; color: #EF4444; }

    .actions-cell { width: 120px; text-align: right !important; }
    .actions-group { display: flex; gap: 4px; justify-content: flex-end; }
    .action-btn { 
      width: 38px; height: 38px; border-radius: 12px; border: none; background: transparent; 
      color: #667A78; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; justify-content: center;
    }
    .action-btn:hover { background: #F0F7F6; color: #4A8E8A; transform: scale(1.1); }
    .action-btn.status.suspend:hover { color: #EF4444; background: #FFF5F5; }
    .action-btn.status.activate:hover { color: #4CAF50; background: #F5FFF5; }
    .action-btn.resend { color: #4A8E8A; }
    .action-btn.resend:hover { background: #E0EDE8; color: #1A3E3B; }
    .action-btn i-lucide { width: 18px; height: 18px; }

    .loading-state { display: flex; flex-direction: column; align-items: center; padding: 5rem; color: #AAA; gap: 1rem; }
    .spinner { width: 40px; height: 40px; border: 3px solid #F0F0F0; border-top-color: #4A8E8A; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
 
    .empty-state { padding: 5rem 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #AAA; gap: 0.5rem; text-align: center; width: 100%; border-radius: 24px; }
    .empty-state p { margin: 0; font-size: 1.1rem; color: #78909c; font-weight: 500; }

    /* --- Modal --- */
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(26, 62, 59, 0.4); backdrop-filter: blur(6px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
    .modal-card { width: 100%; max-width: 650px; background: white; max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column; border-radius: 28px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); transition: max-width 0.3s ease; }
    
    /* Custom Scrollbar */
    .modal-card::-webkit-scrollbar { width: 6px; }
    .modal-card::-webkit-scrollbar-track { background: transparent; }
    .modal-card::-webkit-scrollbar-thumb { background: #E0EDE8; border-radius: 10px; }
    .modal-card::-webkit-scrollbar-thumb:hover { background: #4A8E8A; }
    .modal-header { padding: 1.5rem 2rem; border-bottom: 1px solid #F0F0F0; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 10; gap: 20px; }
    .header-icon-mini { width: 44px; height: 44px; background: #F0F7F6; color: #4A8E8A; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .header-icon-mini i-lucide { width: 22px; height: 22px; }
    .header-labels { flex: 1; }
    .modal-header h2 { font-family: 'Outfit', sans-serif; font-size: 1.4rem; color: #1A3E3B; margin: 0; }
    .modal-header p { font-size: 0.85rem; color: #888; margin: 2px 0 0 0; }

    .btn-close { background: none; border: none; color: #AAA; cursor: pointer; padding: 8px; border-radius: 50%; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
    .btn-close:hover { background: #F5F5F5; color: #4A8E8A; }

    .modal-body { padding: 2rem 2.5rem; display: flex; flex-direction: column; gap: 2.2rem; }
    .form-section { display: flex; flex-direction: column; gap: 1.2rem; }
    .section-badge { display: flex; align-items: center; gap: 12px; font-size: 0.75rem; font-weight: 800; color: #4A8E8A; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; }
    .icon-xs { width: 14px; height: 14px; }

    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.2rem; }
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-group.full { grid-column: 1 / -1; }
    .form-group label { font-size: 0.85rem; font-weight: 700; color: #2D4A47; }
    .form-group input, .form-group select { padding: 14px; border: 1px solid #E8F0ED; border-radius: 14px; font-size: 0.95rem; transition: all 0.2s; width: 100%; box-sizing: border-box; background: #FAFCFB; }
    .form-group input:focus, .form-group select:focus { border-color: #4A8E8A; outline: none; background: white; box-shadow: 0 0 0 4px rgba(74, 142, 138, 0.08); }

    .slug-input { display: flex; align-items: stretch; border: 1px solid #E8F0ED; border-radius: 14px; overflow: hidden; background: #FAFCFB; }
    .slug-input.disabled { background: #F5F7F8; opacity: 0.8; }
    .slug-input .prefix { background: #F0F4F2; padding: 14px; font-size: 0.85rem; color: #888; border-right: 1px solid #E8F0ED; font-weight: 600; }
    .slug-input input { border: none; border-radius: 0; background: transparent; }

    .help-text { font-size: 0.75rem; color: #99A; margin: 4px 0 0 0; }
    .help-text.warning { color: #A8A; font-weight: 600; }

    .modal-footer { margin-top: 1rem; display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #F0F0F0; padding: 1.5rem 2.5rem; background: #FAFCFB; }
    .loader-group { display: flex; align-items: center; gap: 10px; }
    .spin { animation: spin 1s linear infinite; display: inline-block; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    /* Express Mode Styles */
    .express-toggle-container { margin-right: 1.5rem; padding: 10px 16px; background: #F0F7F6; border-radius: 16px; border: 1px solid #E0EDE8; }
    .toggle-control { display: flex; align-items: center; gap: 12px; cursor: pointer; }
    .label-text { font-size: 0.8rem; font-weight: 800; color: #4A8E8A; text-transform: uppercase; letter-spacing: 0.5px; }
    .toggle-control input { display: none; }
    .toggle-slider { width: 44px; height: 24px; background: #CDD7D6; border-radius: 20px; position: relative; transition: .3s; }
    .toggle-slider:before { content: ""; position: absolute; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: .3s; }
    input:checked + .toggle-slider { background: #4A8E8A; }
    input:checked + .toggle-slider:before { transform: translateX(20px); }

    .amount-input { display: flex; align-items: center; background: #FAFCFB; border: 1.5px solid #2D4A47; border-radius: 14px; overflow: hidden; }
    .amount-input .curr { padding: 0 14px; font-weight: 700; color: #2D4A47; background: #F0F7F6; border-right: 1px solid #E0EDE8; }
    .amount-input input { border: none !important; box-shadow: none !important; background: transparent; }
    
    .help-text.suggested { color: #4A8E8A; font-weight: 700; font-style: italic; }

    .preview-box { background: #F9FBFA; border: 1px dashed #C0DED6; padding: 14px; border-radius: 14px; color: #2D4A47; font-weight: 700; display: flex; align-items: center; gap: 10px; }

    .glass-panel { border-radius: 28px; box-shadow: 0 4px 20px rgba(0,0,0,0.01); }
    @media (max-width: 900px) {
      .page-header { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
      .header-actions { flex-direction: column; align-items: stretch; width: 100%; }
      .search-box { min-width: 100%; }
      .btn-primary { justify-content: center; }
    }

    @media (max-width: 768px) {
      .saas-tenants { padding: 1.25rem; }
      .page-header h1 { font-size: 1.8rem; }
      
      .modal-card { width: 95%; max-width: 100%; border-radius: 20px; }
      .modal-header { padding: 1.25rem 1.5rem; }
      .modal-body { padding: 1.5rem; gap: 1.5rem; }
      .modal-footer { padding: 1.25rem 1.5rem; flex-direction: column-reverse; }
      .modal-footer button { width: 100%; }
      
      .form-grid { grid-template-columns: 1fr; gap: 1rem; }
      .form-group.full { grid-column: auto; }
      
      .slug-input .prefix { padding: 10px; font-size: 0.75rem; }
    }
  `]
})
export class SaasTenantsComponent implements OnInit {
  private saasService = inject(SuperAdminService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);
  
  tenants = signal<TenantStats[]>([]);
  packages = signal<Package[]>([]);
  searchTerm = signal('');
  isLoading = signal(true);
  isSaving = signal(false);
  isEditing = signal(false);
  isExpressMode = signal(true); // Default to express for new tenants
  editingId: string | null = null;
  showModal = signal(false);
  
  plazos = [1, 3, 6, 12];
  suggestedAmount = signal(0);

  tenantForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    packageId: ['', [Validators.required]],
    adminEmail: ['', [Validators.required, Validators.email]],
    adminFirstName: ['', [Validators.required]],
    adminLastName: [''],
    monthsCount: [1],
    amount: [0]
  });

  filteredTenants = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.tenants().filter(t => 
      t.name.toLowerCase().includes(term) || t.slug.toLowerCase().includes(term)
    );
  });

  ngOnInit() {
    this.loadData();
    
    // Auto-calculate suggested amount
    this.tenantForm.get('packageId')?.valueChanges.subscribe(() => this.onExpressParamsChange());
    this.tenantForm.get('monthsCount')?.valueChanges.subscribe(() => this.onExpressParamsChange());
  }

  loadData() {
    this.isLoading.set(true);
    this.saasService.getTenants().subscribe({
      next: (t) => {
        this.tenants.set(t);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.saasService.getPackages().subscribe(p => {
      this.packages.set(p.filter(pkg => pkg.isActive));
    });
  }

  isCloseToExpiry(dateStr: string): boolean {
    if (!dateStr) return false;
    const expiry = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays < 7;
  }

  openCreateModal() {
    this.isEditing.set(false);
    this.isExpressMode.set(true);
    this.editingId = null;
    this.tenantForm.reset({
      name: '',
      slug: '',
      packageId: this.packages()[0]?.id || '',
      adminEmail: '',
      adminFirstName: '',
      adminLastName: '',
      monthsCount: 1,
      amount: 0
    });
    this.onExpressParamsChange();
    this.tenantForm.get('slug')?.enable();
    this.tenantForm.get('adminEmail')?.setValidators([Validators.required, Validators.email]);
    this.tenantForm.get('adminFirstName')?.setValidators([Validators.required]);
    this.tenantForm.updateValueAndValidity();
    this.showModal.set(true);
  }

  toggleExpressMode() {
    this.isExpressMode.set(!this.isExpressMode());
    this.onExpressParamsChange();
  }

  onExpressParamsChange() {
    if (!this.isExpressMode() || this.isEditing()) return;
    
    const pkgId = this.tenantForm.get('packageId')?.value;
    const months = Number(this.tenantForm.get('monthsCount')?.value || 1);
    
    const pkg = this.packages().find(p => p.id === pkgId);
    if (!pkg) return;

    let total = pkg.price * months;
    
    // Si el paquete tiene precios definidos por plazo, usarlos
    if (pkg.pricesByTerm && pkg.pricesByTerm[months.toString()]) {
       total = pkg.pricesByTerm[months.toString()];
    }

    this.suggestedAmount.set(total);
    this.tenantForm.patchValue({ amount: total }, { emitEvent: false });
  }

  getExpiryPreview(): Date {
    const months = Number(this.tenantForm.get('monthsCount')?.value || 1);
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date;
  }

  editTenant(tenant: TenantStats) {
    this.isEditing.set(true);
    this.editingId = tenant.id;
    
    // Patch form with existing data
    this.tenantForm.patchValue({
      name: tenant.name,
      slug: tenant.slug,
      packageId: tenant.package.id
    });

    // Disable fields that cannot be edited
    this.tenantForm.get('slug')?.disable();
    
    // Clear admin validators for edit mode since we don't show those fields
    this.tenantForm.get('adminEmail')?.clearValidators();
    this.tenantForm.get('adminFirstName')?.clearValidators();
    this.tenantForm.updateValueAndValidity();

    this.showModal.set(true);
  }

  async toggleStatus(tenant: TenantStats) {
    const action = tenant.isActive ? 'suspender' : 'reactivar';
    const result = await this.notificationService.confirm(
      `¿Deseas ${action} este negocio?`,
      tenant.isActive 
        ? 'El Merchant perderá el acceso y se le enviará un correo de suspensión.' 
        : 'Se restaurará el acceso al sistema y se enviará una notificación al Merchant.',
      tenant.isActive ? 'Confirmar Suspensión' : 'Reactivar Negocio'
    );

    if (result.isConfirmed) {
      this.saasService.toggleTenantStatus(tenant.id).subscribe({
        next: () => {
          this.notificationService.success(
            `¡Negocio ${tenant.isActive ? 'Suspendido' : 'Reactivado'}!`, 
            'El estado ha sido actualizado y el correo enviado.'
          );
          this.loadData();
        },
        error: () => this.notificationService.error('Error', 'No se pudo procesar el cambio de estado.')
      });
    }
  }

  showResendButton(tenant: TenantStats): boolean {
    // La responsabilidad de detección ahora es del backend a través de isPending
    return !!tenant.isPending;
  }

  async resendInvitation(tenant: TenantStats, email?: string) {
    if (!email) {
      const result = await Swal.fire({
        title: '¿Reenviar invitación?',
        text: `Se enviará un nuevo enlace de acceso al correo del administrador de "${tenant.name}".`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#4A8E8A',
        cancelButtonColor: '#667A78',
        confirmButtonText: 'Sí, enviar ahora',
        cancelButtonText: 'Cancelar'
      });
      if (!result.isConfirmed) return;
    }

    try {
      Swal.fire({
        title: 'Procesando...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      await firstValueFrom(this.saasService.resendInvitation(tenant.id, email));
      
      Swal.fire({
        title: '¡Éxito!',
        text: 'La invitación ha sido enviada exitosamente.',
        icon: 'success',
        confirmButtonColor: '#4A8E8A'
      });

      this.loadData();
    } catch (error: any) {
      if (error.error?.message === 'RECOVERY_REQUIRED') {
        const { value: newEmail } = await Swal.fire({
          title: 'Negocio sin Administrador',
          text: 'No se encontró un administrador para este negocio. Por favor ingresa el correo para crear uno nuevo y enviarle el acceso:',
          input: 'email',
          inputPlaceholder: 'correo@ejemplo.com',
          showCancelButton: true,
          confirmButtonText: 'Crear y Enviar',
          confirmButtonColor: '#4A8E8A',
          cancelButtonText: 'Cancelar'
        });

        if (newEmail) {
          this.resendInvitation(tenant, newEmail);
        } else {
          Swal.close();
        }
      } else {
        Swal.fire({
          title: 'Error',
          text: error.error?.message || 'No se pudo procesar la solicitud.',
          icon: 'error',
          confirmButtonColor: '#EF4444'
        });
      }
    }
  }

  closeModal() {
    this.showModal.set(false);
    this.isEditing.set(false);
    this.editingId = null;
  }

  saveTenant() {
    if (this.tenantForm.invalid && !this.isEditing()) return;
    if (this.isEditing() && this.tenantForm.get('name')?.invalid) return;

    this.isSaving.set(true);
    
    const formData = this.tenantForm.getRawValue();
    
    // Ensure numeric types for express registration
    if (this.isExpressMode() && !this.isEditing()) {
      formData.monthsCount = Number(formData.monthsCount);
      formData.amount = Number(formData.amount);
    }
    
    let obs: Observable<any>;

    if (this.isEditing() && this.editingId) {
      obs = this.saasService.updateTenant(this.editingId, { 
        name: formData.name, 
        packageId: formData.packageId 
      });
    } else {
      // All new registrations follow the express flow as requested
      obs = this.saasService.createExpressTenant(formData);
    }

    obs.subscribe({
      next: () => {
        this.notificationService.success(
          this.isEditing() ? '¡Negocio Actualizado!' : '¡Negocio Creado!',
          this.isEditing() 
            ? 'Los cambios operativos se han guardado.' 
            : (this.isExpressMode() ? 'Alta Express exitosa. Se ha enviado la invitación.' : 'Se ha enviado la invitación al administrador.')
        );
        this.loadData();
        this.isSaving.set(false);
        this.closeModal();
      },
      error: (err) => {
        const msg = err.error?.message || 'Error al procesar la solicitud';
        this.notificationService.error('Error', msg);
        this.isSaving.set(false);
      }
    });
  }
}
