import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule, Plus, Search, Filter, Edit2, PlayCircle, PauseCircle, X, CheckCircle, AlertCircle, Calendar, Tag, Info, Trash2, Eye, EyeOff } from 'lucide-angular';
import { NotificationService } from '../../../core/services/notification.service';
import { isAfter } from 'date-fns';
import { computed } from '@angular/core';
import { SuperAdminService, Promotion as SaasPromotion } from '../../../core/services/super-admin.service';

@Component({
  selector: 'app-saas-promotions',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ReactiveFormsModule],
  template: `
    <div class="saas-promotions">
      <header class="page-header">
        <div class="header-content">
          <h1>Cupones y Ofertas</h1>
          <p>Potencia tus ventas gestionando códigos promocionales industriales</p>
        </div>
        <div class="header-actions">
           <div class="toggle-filter glass-panel" [class.active]="showExpired()" (click)="toggleExpired()">
             <i-lucide [name]="showExpired() ? 'eye' : 'eye-off'"></i-lucide>
             <span>{{ showExpired() ? 'Mostrando Todos' : 'Ocultando Expirados' }}</span>
           </div>
           <button class="btn-primary" (click)="openCreateModal()">
             <i-lucide name="plus"></i-lucide>
             Nuevo Cupón
           </button>
        </div>
      </header>

      <div class="promotions-grid" *ngIf="!isLoading()">
        <div class="promo-card glass-panel" *ngFor="let p of filteredPromotions()" [class.expired]="isExpired(p)">
          <div class="promo-header">
            <div class="promo-info">
              <span class="promo-code">{{ p.code }}</span>
              <span class="promo-type" [class.percentage]="p.type === 'PERCENTAGE'">
                {{ p.type === 'PERCENTAGE' ? '%' : '$' }}
              </span>
            </div>
            <div class="promo-status">
              <span class="status-badge" [class.active]="p.isActive && !isExpired(p)" [class.inactive]="!p.isActive" [class.expired]="isExpired(p)">
                {{ isExpired(p) ? 'EXPIRADO' : (p.isActive ? 'ACTIVO' : 'PAUSADO') }}
              </span>
            </div>
          </div>

          <div class="promo-body">
            <p class="promo-description">{{ p.description || 'Sin descripción detallada' }}</p>
            
            <div class="promo-metrics">
              <div class="metric">
                <span class="metric-label">Valor</span>
                <span class="metric-value">{{ p.type === 'PERCENTAGE' ? p.value + '%' : (p.value | currency:'MXN') }}</span>
              </div>
              <div class="metric">
                <span class="metric-label">Usos</span>
                <span class="metric-value">{{ p.usedCount }} / {{ p.maxUses || '∞' }}</span>
              </div>
            </div>

            <div class="promo-footer">
              <div class="expiry-info">
                <i-lucide name="calendar" class="icon-xs"></i-lucide>
                <span>{{ p.validUntil ? (p.validUntil | date:'mediumDate') : 'Sin vencimiento' }}</span>
              </div>
              <div class="card-actions">
                <button class="action-btn edit" (click)="openEditModal(p)">
                  <i-lucide name="edit-2"></i-lucide>
                </button>
                <button class="action-btn toggle" (click)="toggleStatus(p)" [class.active]="p.isActive">
                  <i-lucide [name]="p.isActive ? 'pause-circle' : 'play-circle'"></i-lucide>
                </button>
              </div>
            </div>
          </div>
          
          <div class="expired-overlay" *ngIf="isExpired(p)">
            <i-lucide name="alert-circle"></i-lucide>
            <span>CUPÓN FUERA DE VIGENCIA</span>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state glass-panel" *ngIf="filteredPromotions().length === 0">
           <div class="empty-icon-wrapper">
             <i-lucide name="tag" class="tag-icon"></i-lucide>
           </div>
           <h3>No hay cupones visibles</h3>
           <p>Prueba activando el filtro de expirados o crea un nuevo incentivo.</p>
        </div>
      </div>

      <div class="loading-state glass-panel" *ngIf="isLoading()">
        <div class="spinner"></div>
        <p>Sincronizando motor de promociones...</p>
      </div>

      <!-- Modal de Edición/Creación -->
      <div class="modal-overlay" *ngIf="showModal()" (click)="closeModal()">
        <div class="modal-card glass-panel" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="header-titles">
              <h2>{{ isEdit() ? 'Gestionar Cupón' : 'Lanzar Nueva Oferta' }}</h2>
              <p>{{ isEdit() ? 'Actualiza los parámetros comerciales' : 'Define las reglas de tu nueva promoción' }}</p>
            </div>
            <button class="btn-close" (click)="closeModal()">
              <i-lucide name="x"></i-lucide>
            </button>
          </div>
          
          <form [formGroup]="promoForm" (ngSubmit)="savePromotion()" class="modal-body">
            <div class="form-grid">
              <div class="form-group full">
                <label>Código del Cupón</label>
                <div class="input-wrapper">
                  <i-lucide name="search" class="input-icon"></i-lucide>
                  <input type="text" formControlName="code" placeholder="MAYÚSCULAS Y NÚMEROS" [readonly]="isEdit()" (input)="toUpper($event)">
                </div>
              </div>
              
              <div class="form-group full">
                <label>Descripción Comercial</label>
                <textarea formControlName="description" rows="2" placeholder="Describe el beneficio para el merchant..."></textarea>
              </div>

              <div class="form-group">
                <label>Mecánica</label>
                <select formControlName="type">
                  <option value="PERCENTAGE">Descuento Porcentual (%)</option>
                  <option value="FIXED_AMOUNT">Monto Fijo Directo ($)</option>
                </select>
              </div>

              <div class="form-group">
                <label>Valor de Oferta</label>
                <input type="number" formControlName="value" placeholder="0.00">
              </div>

              <div class="form-group">
                <label>Stock de Usos</label>
                <input type="number" formControlName="maxUses" placeholder="Ilimitado">
              </div>

              <div class="form-group">
                <label>Vigencia Máxima</label>
                <input type="date" formControlName="validUntil">
              </div>

              <div class="form-group full">
                <label class="switch-label">
                  <div class="switch-info">
                    <span class="switch-title">Activar Cupón</span>
                    <span class="switch-desc">Permitir su uso inmediato en la plataforma</span>
                  </div>
                  <input type="checkbox" formControlName="isActive" class="hidden-check">
                  <div class="switch-track" [class.checked]="promoForm.get('isActive')?.value">
                    <div class="switch-thumb"></div>
                  </div>
                </label>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-ghost" (click)="closeModal()">Descartar</button>
              <button type="submit" class="btn-primary" [disabled]="promoForm.invalid || isSaving()">
                <span *ngIf="!isSaving()">{{ isEdit() ? 'Guardar Cambios' : 'Confirmar Creación' }}</span>
                <div *ngIf="isSaving()" class="mini-spinner"></div>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .saas-promotions { padding: 2rem; max-width: 1100px; margin: 0 auto; animation: fadeIn 0.4s ease-out; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3rem; }
    .page-header h1 { font-family: 'Outfit', sans-serif; font-size: 2.2rem; color: #1A3E3B; margin: 0; }
    .page-header p { color: #667; margin: 4px 0 0 0; font-size: 1.05rem; }
    
    .header-actions { display: flex; gap: 16px; align-items: center; }
    .toggle-filter { border: 1px solid #E0EDE8; padding: 10px 18px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: 0.3s; font-size: 0.85rem; font-weight: 700; color: #4A8E8A; }
    .toggle-filter:hover { background: #F8FBF9; border-color: #4A8E8A; }
    .toggle-filter.active { background: #4A8E8A; color: white; border-color: #4A8E8A; }
    .toggle-filter i-lucide { width: 18px; height: 18px; }

    .btn-primary { background: #4A8E8A; color: white; border: none; padding: 14px 24px; border-radius: 16px; font-weight: 700; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 12px rgba(74,142,138,0.2); }
    .btn-primary:hover:not(:disabled) { background: #3D7672; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(74,142,138,0.3); }

    .promotions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; transition: 0.3s; }
    .promo-card { position: relative; border: 1px solid #F0F5F2; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden; }
    .promo-card:hover { transform: translateY(-4px); box-shadow: 0 15px 35px rgba(0,0,0,0.04); border-color: #4A8E8A33; }
    .promo-card.expired { opacity: 0.7; }

    .promo-header { padding: 1.5rem; border-bottom: 1px solid #F8FBF9; display: flex; justify-content: space-between; align-items: flex-start; }
    .promo-info { display: flex; align-items: center; gap: 12px; }
    .promo-code { font-family: 'Space Mono', monospace; font-size: 1.2rem; font-weight: 800; color: #1A3E3B; background: #E1F3F1; padding: 4px 12px; border-radius: 8px; }
    .promo-type { width: 32px; height: 32px; border-radius: 50%; background: #4A8E8A; color: white; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.8rem; }
    .promo-type.percentage { background: #FFB300; }

    .status-badge { font-size: 0.65rem; font-weight: 800; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px; }
    .status-badge.active { background: #E1F3F1; color: #4A8E8A; }
    .status-badge.inactive { background: #F5F5F7; color: #889; }
    .status-badge.expired { background: #FEE2E2; color: #E57373; }

    .promo-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.2rem; }
    .promo-description { margin: 0; color: #667; font-size: 0.95rem; line-height: 1.5; height: 2.8rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

    .promo-metrics { display: flex; justify-content: space-between; background: #F8FBF9; padding: 12px 20px; border-radius: 12px; }
    .metric { display: flex; flex-direction: column; }
    .metric-label { font-size: 0.7rem; color: #9AA; font-weight: 700; text-transform: uppercase; }
    .metric-value { font-size: 1rem; font-weight: 800; color: #2D4A47; }

    .promo-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; }
    .expiry-info { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #9AA; font-weight: 600; }
    .icon-xs { width: 14px; height: 14px; }
    
    .card-actions { display: flex; gap: 8px; }
    .action-btn { width: 36px; height: 36px; border-radius: 10px; border: 1px solid #F0F0F0; background: white; color: #AAA; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
    .action-btn:hover { color: #4A8E8A; border-color: #4A8E8A; background: #F8FBF9; }
    .action-btn.active { color: #4A8E8A; border-color: #4A8E8A; }
    
    .expired-overlay { position: absolute; inset: 0; background: rgba(255,255,255,0.8); backdrop-filter: blur(2px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: #E57373; font-weight: 800; font-size: 0.85rem; opacity: 0; transition: 0.3s; }
    .promo-card.expired:hover .expired-overlay { opacity: 1; }

    /* Modal Styling */
    .modal-overlay { position: fixed; inset: 0; background: rgba(26, 62, 59, 0.4); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 2rem; }
    .modal-card { width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; animation: modalIn 0.3s ease; position: relative; }
    .modal-card::-webkit-scrollbar { width: 6px; }
    .modal-card::-webkit-scrollbar-thumb { background: rgba(74, 142, 138, 0.2); border-radius: 10px; }
    @keyframes modalIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    
    .modal-header { padding: 2rem 2.5rem; border-bottom: 1px solid #F0F5F2; display: flex; justify-content: space-between; align-items: flex-start; }
    .header-titles h2 { font-family: 'Outfit', sans-serif; font-size: 1.6rem; color: #1A3E3B; margin: 0; }
    .header-titles p { color: #889; margin: 6px 0 0 0; font-size: 0.95rem; }
    
    .modal-body { padding: 2.5rem; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.8rem; }
    .form-group.full { grid-column: span 2; }
    .form-group label { display: block; font-size: 0.85rem; font-weight: 700; color: #2D4A47; margin-bottom: 8px; }
    
    .input-wrapper { position: relative; }
    .input-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); width: 18px; color: #BDD2CD; }
    .input-wrapper input { padding-left: 44px; width: 100%; }
    
    input, select, textarea { width: 100%; padding: 12px 16px; border: 2px solid #F0F5F2; border-radius: 12px; font-size: 0.95rem; font-weight: 600; color: #2D4A47; transition: 0.2s; }
    input:focus, select:focus, textarea:focus { border-color: #4A8E8A; outline: none; background: #F8FBF9; }
    
    /* Switch Label */
    .switch-label { display: flex; justify-content: space-between; align-items: center; background: #F8FBF9; padding: 1.5rem; border-radius: 16px; cursor: pointer; border: 2px solid transparent; transition: 0.3s; }
    .switch-label:hover { border-color: #E1F3F1; }
    .switch-title { display: block; font-weight: 800; color: #1A3E3B; }
    .switch-desc { display: block; font-size: 0.8rem; color: #9AA; font-weight: 500; }
    
    .switch-track { width: 50px; height: 28px; background: #BDD2CD; border-radius: 20px; position: relative; transition: 0.3s; }
    .switch-track.checked { background: #4A8E8A; }
    .switch-thumb { width: 22px; height: 22px; background: white; border-radius: 50%; position: absolute; top: 3px; left: 3px; transition: 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .switch-track.checked .switch-thumb { left: 25px; }
    .hidden-check { display: none; }

    .modal-footer { margin-top: 2.5rem; display: flex; justify-content: flex-end; gap: 12px; }
    .btn-ghost { background: transparent; border: none; padding: 12px 24px; color: #9AA; font-weight: 700; cursor: pointer; }
    .mini-spinner { width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }

    .empty-state { grid-column: 1 / -1; text-align: center; padding: 6rem; }
    .empty-icon-wrapper { width: 80px; height: 80px; background: #F0F7F6; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: #4A8E8A; }
    .tag-icon { width: 40px; height: 40px; }
    .glass-panel { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); border-radius: 28px; box-shadow: 0 4px 30px rgba(0,0,0,0.02); }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    @media (max-width: 768px) {
      .saas-promotions { padding: 1.25rem; }
      .page-header { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
      .header-actions { width: 100%; flex-direction: column; }
      .toggle-filter, .btn-primary { width: 100%; justify-content: center; }
      .promotions-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class SaasPromotionsComponent implements OnInit {
  private saasService = inject(SuperAdminService);
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);

  promotions = signal<SaasPromotion[]>([]);
  isLoading = signal(true);
  isSaving = signal(false);
  showModal = signal(false);
  isEdit = signal(false);
  selectedId = signal<string | null>(null);

  // Suggested Logic: Show/Hide Expired
  showExpired = signal(false);

  // Computed signal for filtered promotions
  filteredPromotions = computed(() => {
    const all = this.promotions();
    if (this.showExpired()) return all;
    return all.filter((p) => !this.isExpired(p));
  });

  promoForm: FormGroup = this.fb.group({
    code: [
      '',
      [
        Validators.required,
        Validators.maxLength(15),
        Validators.pattern(/^[A-Z0-9]+$/),
      ],
    ],
    description: ['', [Validators.maxLength(100)]],
    type: ['PERCENTAGE', [Validators.required]],
    value: [0, [Validators.required, Validators.min(0)]],
    maxUses: [null, [Validators.min(1)]],
    validUntil: [null],
    isActive: [true],
  });

  ngOnInit() {
    this.loadPromotions();
  }

  loadPromotions() {
    this.isLoading.set(true);
    this.saasService.getPromotions().subscribe({
      next: (p) => {
        this.promotions.set(p);
        this.isLoading.set(false);
      },
      error: () => {
        this.notificationService.error(
          'Error',
          'No se pudo sincronizar la base de cupones.',
        );
        this.isLoading.set(false);
      },
    });
  }

  isExpired(p: SaasPromotion): boolean {
    if (p.validUntil && isAfter(new Date(), new Date(p.validUntil))) return true;
    if (p.maxUses && p.usedCount >= p.maxUses) return true;
    return false;
  }

  toggleExpired() {
    this.showExpired.update((v) => !v);
  }

  toUpper(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.toUpperCase();
    this.promoForm.get('code')?.setValue(input.value, { emitEvent: false });
  }

  openCreateModal() {
    this.isEdit.set(false);
    this.selectedId.set(null);
    this.promoForm.reset({
      type: 'PERCENTAGE',
      value: 0,
      isActive: true,
    });
    this.showModal.set(true);
  }

  openEditModal(promo: SaasPromotion) {
    this.isEdit.set(true);
    this.selectedId.set(promo.id);
    this.promoForm.patchValue({
      code: promo.code,
      description: promo.description,
      type: promo.type,
      value: promo.value,
      maxUses: promo.maxUses,
      validUntil: promo.validUntil ? promo.validUntil.split('T')[0] : null,
      isActive: promo.isActive,
    });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  async savePromotion() {
    if (this.promoForm.invalid) return;

    // Advanced Validation: Percentage logic
    if (
      this.promoForm.value.type === 'PERCENTAGE' &&
      this.promoForm.value.value > 100
    ) {
      this.notificationService.error(
        'Validación',
        'El porcentaje no puede ser mayor al 100%.',
      );
      return;
    }

    this.isSaving.set(true);
    const formData = this.promoForm.value;

    const req = this.isEdit()
      ? this.saasService.updatePromotion(this.selectedId()!, formData)
      : this.saasService.createPromotion(formData);

    req.subscribe({
      next: () => {
        this.notificationService.success(
          this.isEdit() ? 'Cupón Actualizado' : 'Cupón Creado',
          `El código ${formData.code} está listo para usarse.`,
        );
        this.loadPromotions();
        this.isSaving.set(false);
        this.closeModal();
      },
      error: (err) => {
        this.notificationService.error(
          'Transacción Denegada',
          err.error?.message || 'Error al guardar el cupón.',
        );
        this.isSaving.set(false);
      },
    });
  }

  toggleStatus(promo: SaasPromotion) {
    const newStatus = !promo.isActive;
    this.saasService.updatePromotion(promo.id, { isActive: newStatus }).subscribe({
      next: () => {
        this.notificationService.success(
          newStatus ? 'Cupón Activado' : 'Cupón Pausado',
          `Se ha actualizado el estado de ${promo.code}.`,
        );
        this.loadPromotions();
      },
      error: () =>
        this.notificationService.error(
          'Error',
          'No se pudo cambiar el estado del cupón.',
        ),
    });
  }
}
