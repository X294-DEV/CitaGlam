import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { 
  LucideAngularModule, 
  Plus, 
  Package, 
  PackageX, 
  Check, 
  Edit2, 
  PauseCircle, 
  PlayCircle, 
  X,
  RefreshCw,
  Tag,
  Settings,
  Shield,
  Layers
} from 'lucide-angular';
import { SuperAdminService, Package as SaasPackage } from '../../../core/services/super-admin.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-saas-packages',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    LucideAngularModule
  ],
  template: `
    <div class="saas-packages">
      <header class="page-header">
        <div class="header-content">
          <h1>Planes y Paquetes</h1>
          <p>Configura los precios y límites del SaaS</p>
        </div>
        <button class="btn-primary" (click)="openCreateModal()">
          <i-lucide name="plus"></i-lucide>
          Nuevo Plan
        </button>
      </header>

      <div class="packages-grid" *ngIf="!isLoading()">
        <div class="package-card glass-panel" [class.inactive]="!p.isActive" *ngFor="let p of packages()">
          <div class="card-header">
            <div class="pkg-icon" [class.inactive]="!p.isActive">
              <i-lucide [name]="p.isActive ? 'package' : 'package-x'"></i-lucide>
            </div>
            <div class="pkg-title">
              <div class="title-tags">
                <h3>{{ p.name }}</h3>
                <span class="badge" *ngIf="!p.isPublic">Privado</span>
                <span class="badge inactive" *ngIf="!p.isActive">Inactivo</span>
              </div>
              <div class="price-box">
                <span class="from-label" *ngIf="hasMultipleTerms(p)">Desde</span>
                <span class="price">{{ getLowestMonthlyPrice(p) | currency }} <small>/mes</small></span>
              </div>
            </div>
          </div>
          
          <div class="pkg-body">
             <p class="desc">{{ p.description }}</p>
             <div class="limits-info">
               <div class="limit">
                 <span class="label">Servicios:</span> 
                 <span class="value">{{ p.limits?.maxServices || 'Ilimitados' }}</span>
               </div>
               <div class="limit">
                 <span class="label">Sucursales:</span> 
                 <span class="value">{{ p.limits?.maxBranches || 'Ilimitados' }}</span>
               </div>
               <div class="limit">
                 <span class="label">Personal:</span> 
                 <span class="value">{{ p.limits?.maxUsers || 'Ilimitados' }}</span>
               </div>
               <div class="limit">
                 <span class="label">Prueba:</span> 
                 <span class="value">{{ p.trialDays }} días</span>
               </div>
             </div>
             <div class="features-list" *ngIf="p.features">
               <div class="feature-tag" *ngIf="p.features.staff">
                 <i-lucide name="check" class="icon-xs"></i-lucide> Módulo Staff
               </div>
               <div class="feature-tag" *ngIf="p.features.whatsapp">
                 <i-lucide name="check" class="icon-xs"></i-lucide> WhatsApp
               </div>
               <div class="feature-tag" *ngIf="p.features.customBranding">
                 <i-lucide name="check" class="icon-xs"></i-lucide> Branding
               </div>
               <div class="feature-tag" *ngIf="p.features.analytics">
                 <i-lucide name="check" class="icon-xs"></i-lucide> Analytics
               </div>
             </div>
          </div>

          <div class="card-footer">
            <button class="btn-icon" (click)="openEditModal(p)" title="Editar">
              <i-lucide name="edit-2"></i-lucide>
            </button>
            <button class="btn-icon" [class.text-red]="p.isActive" [class.text-green]="!p.isActive" (click)="toggleStatus(p)" [title]="p.isActive ? 'Desactivar' : 'Activar'">
              <i-lucide [name]="p.isActive ? 'pause-circle' : 'play-circle'"></i-lucide>
            </button>
          </div>
        </div>
      </div>

      <div class="loading-state" *ngIf="isLoading()">
        <div class="spinner"></div>
        <p>Cargando planes...</p>
      </div>

      <!-- Modal de Edición/Creación -->
      <div class="modal-overlay" *ngIf="showModal()" (click)="closeModal()">
        <div class="modal-card glass-panel" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="header-icon-mini">
              <i-lucide [name]="isEdit() ? 'edit-2' : 'plus'"></i-lucide>
            </div>
            <div class="header-labels">
              <h2>{{ isEdit() ? 'Editar Plan' : 'Crear Nuevo Plan' }}</h2>
              <p>{{ isEdit() ? 'Actualiza los parámetros comerciales del paquete' : 'Define una nueva oferta comercial para el SaaS' }}</p>
            </div>
            <button class="btn-close" (click)="closeModal()">
              <i-lucide name="x"></i-lucide>
            </button>
          </div>
          
          <form [formGroup]="packageForm" (ngSubmit)="savePackage()" class="modal-body">
            <div class="form-section">
              <div class="section-badge"><i-lucide name="tag" class="icon-xs"></i-lucide> Identidad del Plan</div>
              <div class="form-grid">
                <div class="form-group full">
                  <label>Nombre del Plan</label>
                  <input type="text" formControlName="name" placeholder="Ej: Plan Pro">
                </div>
                <div class="form-group full">
                  <label>Descripción</label>
                  <textarea formControlName="description" rows="2" placeholder="Breve resumen de beneficios..."></textarea>
                </div>
              </div>
            </div>
              
            <div class="form-section">
              <div class="section-badge"><i-lucide name="layers" class="icon-xs"></i-lucide> Precios por Plazo (Pesos)</div>
              <div class="form-grid full" formGroupName="pricesByTerm">
                <div class="form-group">
                  <label>1 Mes (Base)</label>
                  <input type="number" formControlName="1" (change)="autoCalculateTerms()">
                </div>
                <div class="form-group">
                  <label>3 Meses</label>
                  <input type="number" formControlName="3">
                </div>
                <div class="form-group">
                  <label>6 Meses</label>
                  <input type="number" formControlName="6">
                </div>
                <div class="form-group">
                  <label>12 Meses</label>
                  <input type="number" formControlName="12">
                </div>
              </div>
            </div>

            <div class="form-section">
              <div class="section-badge"><i-lucide name="settings" class="icon-xs"></i-lucide> Configuración y Visibilidad</div>
              <div class="form-grid">
                <div class="form-group">
                  <label>Días de prueba</label>
                  <input type="number" formControlName="trialDays">
                </div>
                <div class="form-group flags">
                  <label class="checkbox-label">
                    <input type="checkbox" formControlName="isActive"> Activo
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" formControlName="isPublic"> Público
                  </label>
                </div>
              </div>
              <p class="help-text warning" *ngIf="!isEdit()">* Los planes nuevos se guardan como borradores por seguridad.</p>
            </div>

            <div class="form-section">
              <div class="section-badge"><i-lucide name="shield" class="icon-xs"></i-lucide> Límites Operativos</div>
              <div class="form-grid" formGroupName="limits">
                <div class="form-group">
                  <label>Máx Servicios</label>
                  <input type="number" formControlName="maxServices" placeholder="0 = Ilimitado">
                </div>
                <div class="form-group">
                  <label>Máx Sucursales</label>
                  <input type="number" formControlName="maxBranches" placeholder="0 = Ilimitado">
                </div>
                <div class="form-group">
                  <label>Máx Personal</label>
                  <input type="number" formControlName="maxUsers" placeholder="0 = Ilimitado">
                </div>
              </div>
            </div>

            <div class="form-section">
              <div class="section-badge"><i-lucide name="check" class="icon-xs"></i-lucide> Módulos Incluidos</div>
              <div class="features-grid" formGroupName="features">
                <label class="feature-check">
                  <input type="checkbox" formControlName="staff">
                  <span>Gestión de Personal</span>
                </label>
                <label class="feature-check">
                  <input type="checkbox" formControlName="whatsapp">
                  <span>WhatsApp</span>
                </label>
                <label class="feature-check">
                  <input type="checkbox" formControlName="customBranding">
                  <span>Branding</span>
                </label>
                <label class="feature-check">
                  <input type="checkbox" formControlName="analytics">
                  <span>Analytics Avanzado</span>
                </label>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="closeModal()">Cancelar</button>
              <button type="submit" class="btn-primary" [disabled]="packageForm.invalid || isSaving()">
                <span *ngIf="!isSaving()">{{ isEdit() ? 'Guardar Cambios' : 'Crear Plan' }}</span>
                <span *ngIf="isSaving()" class="loader-group">
                  <i-lucide name="refresh-cw" class="icon-xs spin"></i-lucide>
                  Procesando...
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .saas-packages { padding: 2.5rem; max-width: 1400px; margin: 0 auto; position: relative; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; gap: 1rem; }
    .page-header h1 { font-family: 'Outfit', sans-serif; font-size: 2.2rem; color: #2D4A47; margin: 0; white-space: nowrap; }
    .page-header p { color: #888; margin: 4px 0 0 0; }

    .btn-primary { background: #4A8E8A; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.3s ease; }
    .btn-primary:hover:not(:disabled) { background: #3d7571; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(74, 142, 138, 0.2); }
    .btn-primary:disabled { background: #CCC; cursor: not-allowed; }

    .btn-secondary { background: #F0F5F2; color: #4A8E8A; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.3s ease; }
    .btn-secondary:hover { background: #E0EDE8; }

    .packages-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem; }
    .package-card { background: white; padding: 24px; display: flex; flex-direction: column; border: 1px solid #F0F5F2; transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1); min-height: 520px; }
    .package-card.inactive { opacity: 0.8; background: #FAFAFA; border-color: #EEE; }
    .package-card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0,0,0,0.05); border-color: #4A8E8A33; }
    
    .card-header { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
    .pkg-icon { width: 56px; height: 56px; background: #F0F7F6; color: #4A8E8A; border-radius: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.3s; }
    .pkg-icon.inactive { background: #F5F5F5; color: #AAA; }
    i-lucide { display: block; width: 24px; height: 24px; }
    .icon-xs { width: 16px; height: 16px; }
    
    .pkg-title { flex: 1; }
    .title-tags { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
    .pkg-title h3 { font-family: 'Outfit', sans-serif; font-size: 1.3rem; color: #1A3E3B; margin: 0; }
    
    .price-box { display: flex; flex-direction: column; }
    .from-label { font-size: 0.7rem; color: #AAA; text-transform: uppercase; font-weight: 700; }
    .price { font-size: 1.2rem; font-weight: 800; color: #4A8E8A; }
    .price small { font-size: 0.8rem; color: #888; font-weight: 400; }

    .badge { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: #E0EDE8; color: #4A8E8A; }
    .badge.inactive { background: #F5F5F5; color: #888; }

    .pkg-body { flex: 1; display: flex; flex-direction: column; gap: 20px; }
    .desc { font-size: 0.95rem; color: #666; line-height: 1.6; margin: 0; min-height: 3em; }
    
    .limits-info { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px; background: #FAFBFC; border-radius: 16px; }
    .limit { display: flex; flex-direction: column; gap: 2px; }
    .limit .label { font-size: 0.75rem; color: #AAA; text-transform: uppercase; letter-spacing: 0.5px; }
    .limit .value { font-size: 0.9rem; font-weight: 600; color: #444; }

    .features-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .feature-tag { font-size: 0.75rem; background: #F0F7F6; color: #4A8E8A; padding: 4px 10px; border-radius: 12px; display: flex; align-items: center; gap: 4px; font-weight: 600; }
    
    .card-footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #F0F0F0; display: flex; justify-content: flex-end; gap: 12px; }
    .btn-icon { background: #F8F9FA; border: none; color: #777; cursor: pointer; padding: 10px; border-radius: 10px; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; }
    .btn-icon:hover { background: #E0E7E6; color: #4A8E8A; }
    .btn-icon.text-red:hover { color: #E57373; background: #FFF1F1; }
    .btn-icon.text-green:hover { color: #81C784; background: #F1FFF1; }
    
    .loading-state { display: flex; flex-direction: column; align-items: center; padding: 4rem; color: #888; gap: 1rem; }
    .spinner { width: 40px; height: 40px; border: 3px solid #F0F0F0; border-top-color: #4A8E8A; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* --- Modal --- */
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(26, 62, 59, 0.4); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; box-sizing: border-box; }
    .modal-card { width: 100%; max-width: 650px; background: white; max-height: 90vh; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; border-radius: 28px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
    
    /* Custom Scrollbar for Modal */
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

    .modal-body { padding: 2rem 2.5rem; display: flex; flex-direction: column; gap: 2.2rem; box-sizing: border-box; }
    .form-section { display: flex; flex-direction: column; gap: 1.2rem; }
    .section-badge { display: flex; align-items: center; gap: 12px; font-size: 0.75rem; font-weight: 800; color: #4A8E8A; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; }
    .icon-xs { width: 14px; height: 14px; }

    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.2rem; }
    .form-group.full { grid-column: 1 / -1; }
    .form-group { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .form-group label { font-size: 0.85rem; font-weight: 700; color: #2D4A47; }
    .form-group input, .form-group textarea, .form-group select { padding: 14px; border: 1px solid #E8F0ED; border-radius: 14px; font-size: 0.95rem; transition: all 0.2s; width: 100%; box-sizing: border-box; background: #FAFCFB; }
    .form-group input:focus, .form-group textarea:focus, .form-group select:focus { border-color: #4A8E8A; outline: none; background: white; box-shadow: 0 0 0 4px rgba(74, 142, 138, 0.08); }
    
    .form-group.flags { display: flex; flex-direction: row; align-items: center; flex-wrap: wrap; gap: 24px; padding-top: 12px; }
    .checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; color: #444; cursor: pointer; }

    .help-text { font-size: 0.75rem; color: #99A; margin: 4px 0 0 0; }
    .help-text.warning { color: #A8A; font-weight: 600; }
    
    .features-grid { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
    .feature-check { display: flex; align-items: center; gap: 10px; padding: 12px; background: #FAFBFC; border-radius: 12px; cursor: pointer; transition: all 0.2s; border: 1px solid #E8F0ED; }
    .feature-check:hover { background: #F0F7F6; border-color: #4A8E8A33; }
    .feature-check input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; }
    .feature-check span { font-size: 0.9rem; color: #555; font-weight: 500; }

    .modal-footer { margin-top: 1rem; display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #F0F0F0; padding: 1.5rem 2.5rem; background: #FAFCFB; position: sticky; bottom: 0; z-index: 10; }
    
    .loader-group { display: flex; align-items: center; gap: 10px; }
    .spin { animation: spin 1s linear infinite; display: inline-block; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    .glass-panel { border-radius: 28px; box-shadow: 0 4px 20px rgba(0,0,0,0.01); }

    @media (max-width: 900px) {
      .page-header { flex-direction: column; align-items: flex-start; }
      .btn-primary { width: 100%; justify-content: center; }
    }

    @media (max-width: 768px) {
      .saas-packages { padding: 1.25rem; }
      .page-header h1 { font-size: 1.8rem; }
      
      .packages-grid { grid-template-columns: 1fr; gap: 1.5rem; }
      .package-card { min-height: auto; padding: 20px; }
      
      .modal-card { width: 95%; max-width: 100%; border-radius: 20px; }
      .modal-header { padding: 1.25rem 1.5rem; }
      .modal-body { padding: 1.5rem; gap: 1.5rem; }
      .modal-footer { padding: 1.25rem 1.5rem; flex-direction: column-reverse; }
      .modal-footer button { width: 100%; }
      
      .form-grid { grid-template-columns: 1fr; gap: 1rem; }
      .form-group.full { grid-column: auto; }
      .features-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class SaasPackagesComponent implements OnInit {
  private saasService = inject(SuperAdminService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  packages = signal<SaasPackage[]>([]);
  isLoading = signal(true);
  isSaving = signal(false);
  showModal = signal(false);
  isEdit = signal(false);
  selectedId = signal<string | null>(null);

  packageForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
    description: ['', [Validators.maxLength(250)]],
    price: [0], // Base price (redundant but kept for DB compat)
    interval: ['monthly'],
    pricesByTerm: this.fb.group({
      "1": [0, [Validators.required, Validators.min(0)]],
      "3": [0, [Validators.required, Validators.min(0)]],
      "6": [0, [Validators.required, Validators.min(0)]],
      "12": [0, [Validators.required, Validators.min(0)]]
    }),
    trialDays: [0, [Validators.min(0), Validators.max(365)]],
    isActive: [true],
    isPublic: [true],
    limits: this.fb.group({
      maxServices: [0, [Validators.min(0)]],
      maxBranches: [0, [Validators.min(0)]],
      maxUsers: [0, [Validators.min(0)]]
    }),
    features: this.fb.group({
      staff: [false],
      whatsapp: [false],
      customBranding: [false],
      analytics: [false]
    })
  });

  ngOnInit() {
    this.loadPackages();
  }

  loadPackages() {
    this.isLoading.set(true);
    this.saasService.getPackages().subscribe({
      next: (p) => {
        this.packages.set(p);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading packages', err);
        this.isLoading.set(false);
      }
    });
  }

  hasMultipleTerms(pkg: SaasPackage): boolean {
    return !!pkg.pricesByTerm && Object.keys(pkg.pricesByTerm).length > 1;
  }

  getLowestMonthlyPrice(pkg: SaasPackage): number {
    if (!pkg.pricesByTerm) return pkg.price;
    const terms = Object.keys(pkg.pricesByTerm);
    let minMonthly = 9999999;

    terms.forEach(term => {
      const months = parseInt(term);
      const totalPrice = pkg.pricesByTerm![term];
      const monthly = totalPrice / months;
      if (monthly < minMonthly) minMonthly = monthly;
    });

    return minMonthly === 9999999 ? pkg.price : minMonthly;
  }

  autoCalculateTerms() {
    const base = this.packageForm.get('pricesByTerm.1')?.value || 0;
    this.packageForm.patchValue({
      pricesByTerm: {
        "3": Math.round(base * 3 * 0.95), // 5% off
        "6": Math.round(base * 6 * 0.90), // 10% off
        "12": Math.round(base * 12 * 0.85) // 15% off (mejor que 2 meses gratis)
      }
    });
  }

  openCreateModal() {
    this.isEdit.set(false);
    this.selectedId.set(null);
    this.packageForm.reset({
      price: 0,
      interval: 'monthly',
      trialDays: 30,
      isActive: false, // Default to draft
      isPublic: false, // Default to draft
      pricesByTerm: { "1": 0, "3": 0, "6": 0, "12": 0 },
      limits: { maxServices: 0, maxBranches: 0, maxUsers: 0 },
      features: { staff: true, whatsapp: false, customBranding: false, analytics: false }
    });
    this.showModal.set(true);
  }

  openEditModal(pkg: SaasPackage) {
    this.isEdit.set(true);
    this.selectedId.set(pkg.id);
    this.packageForm.patchValue({
      name: pkg.name,
      description: pkg.description,
      price: pkg.price,
      interval: pkg.interval,
      trialDays: pkg.trialDays,
      isActive: pkg.isActive,
      isPublic: pkg.isPublic,
      pricesByTerm: {
        "1": pkg.pricesByTerm?.['1'] || pkg.price,
        "3": pkg.pricesByTerm?.['3'] || pkg.price * 3,
        "6": pkg.pricesByTerm?.['6'] || pkg.price * 6,
        "12": pkg.pricesByTerm?.['12'] || pkg.price * 12
      },
      limits: {
        maxServices: pkg.limits?.maxServices || 0,
        maxBranches: pkg.limits?.maxBranches || 0,
        maxUsers: pkg.limits?.maxUsers || 0
      },
      features: {
        staff: pkg.features?.staff || false,
        whatsapp: pkg.features?.whatsapp || false,
        customBranding: pkg.features?.customBranding || false,
        analytics: pkg.features?.analytics || false
      }
    });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  savePackage() {
    if (this.packageForm.invalid) return;
    this.isSaving.set(true);

    const formData = this.packageForm.value;
    // Ensure base price is synced with 1 month price for legacy support
    formData.price = formData.pricesByTerm['1'];

    const req = this.isEdit() 
      ? this.saasService.updatePackage(this.selectedId()!, formData)
      : this.saasService.createPackage(formData);

    req.subscribe({
      next: () => {
        this.notificationService.success(
          this.isEdit() ? '¡Plan Actualizado!' : '¡Plan Creado!',
          this.isEdit() ? 'Los cambios comerciales se han guardado correctamente.' : 'El nuevo plan se ha guardado como borrador.'
        );
        this.loadPackages();
        this.isSaving.set(false);
        this.closeModal();
      },
      error: (err) => {
        const msg = err.error?.message || 'Error al procesar el paquete';
        this.notificationService.error('Error', msg);
        this.isSaving.set(false);
      }
    });
  }

  async toggleStatus(pkg: SaasPackage) {
    const action = pkg.isActive ? 'desactivar' : 'activar';
    const confirm = await this.notificationService.confirm(
      `¿Deseas ${action} este plan?`,
      pkg.isActive 
        ? 'El plan dejará de estar disponible para nuevas suscripciones.' 
        : 'El plan volverá a estar operativo en el sistema.',
      pkg.isActive ? 'warning' : 'info'
    );

    if (confirm) {
      this.saasService.updatePackage(pkg.id, { isActive: !pkg.isActive }).subscribe({
        next: () => {
          this.notificationService.success('¡Estado Actualizado!', `El plan ahora está ${!pkg.isActive ? 'activo' : 'inactivo'}.`);
          this.loadPackages();
        },
        error: () => this.notificationService.error('Error', 'No se pudo cambiar el estado del plan.')
      });
    }
  }
}
