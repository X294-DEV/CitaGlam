import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy, inject, signal, computed } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule, CreditCard, ShieldCheck, Mail, Bell, Landmark, Hash, Key, UserCheck, FileText, Globe, Palette, Cloud, FileCode, Scale, Settings, Eye, EyeOff, Info, Zap, CheckCircle, XCircle, Calendar, Clipboard, Download, Share2, Printer, X, Clock, History, Layers, ExternalLink } from 'lucide-angular';
import { SuperAdminService } from '../../../core/services/super-admin.service';
import { Router, ActivatedRoute, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NotificationService } from '../../../core/services/notification.service';
import Swal from 'sweetalert2';

// @ts-ignore
import Quill from 'quill';

type ConfigTab = 'general' | 'identity' | 'operations' | 'cloud' | 'templates' | 'legal' | 'integrations';

@Component({
  selector: 'app-saas-config',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ReactiveFormsModule, FormsModule, RouterModule],
  template: `
    <div class="saas-config">
      <header class="page-header">
        <div class="header-content">
          <h1>Centro de Control Maestro</h1>
          <p>Personaliza la identidad y operación global de tu ecosistema SaaS</p>
        </div>
      </header>

      <div class="config-layout">
        <!-- Main Content Area -->
        <main class="config-main">
          <div [ngSwitch]="activeTab()" class="tab-content">
            
            <!-- Tab: general -->
            <div *ngSwitchCase="'general'" class="glass-panel main-panel animate-fade-in">
              <header class="panel-header">
                <h2>Configuración General</h2>
                <p>Ajustes básicos del sistema y localización</p>
              </header>

              <form [formGroup]="generalForm" (ngSubmit)="saveConfig('general')" class="panel-body">
                <div class="form-grid">
                  <div class="form-group">
                    <label>Nombre del Sistema</label>
                    <input type="text" formControlName="systemName" placeholder="CGBG Software" [class.invalid]="generalForm.get('systemName')?.invalid && generalForm.get('systemName')?.touched">
                    <span class="error-msg" *ngIf="generalForm.get('systemName')?.invalid && generalForm.get('systemName')?.touched">
                      Requerido (Máx 100 caracteres)
                    </span>
                  </div>
                  <div class="form-group">
                    <label>Moneda Global</label>
                    <select formControlName="currency">
                      <option value="MXN">MXN - Peso Mexicano</option>
                      <option value="USD">USD - Dólar Americano</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Zona Horaria</label>
                    <select formControlName="timezone">
                      <option value="America/Mexico_City">CDMX / Guadalajara (UTC-6)</option>
                      <option value="America/Tijuana">Tijuana (UTC-8)</option>
                      <option value="America/Cancun">Cancún (UTC-5)</option>
                      <option value="UTC">UTC (Universal)</option>
                    </select>
                  </div>
                  <div class="form-group maintenance-toggle">
                    <label class="toggle-label">
                      <span>Modo Mantenimiento</span>
                      <input type="checkbox" formControlName="maintenanceMode">
                      <span class="slider"></span>
                    </label>
                    <p class="help-text">Si se activa, el sistema mostrará una página de pausa a todos los usuarios.</p>
                  </div>
                </div>
                <div class="actions">
                  <button type="submit" class="btn-primary" [disabled]="generalForm.invalid || isSaving()">
                    <span *ngIf="!isSaving()">Guardar Cambios</span>
                    <span *ngIf="isSaving()" class="loading-btn">
                      <div class="spinner-xs"></div> Guardando...
                    </span>
                  </button>
                </div>
              </form>
            </div>

            <!-- Tab: identity (Branding) -->
            <div *ngSwitchCase="'identity'" class="glass-panel main-panel animate-fade-in">
              <header class="panel-header">
                <h2>Identidad de Marca</h2>
                <p>Personaliza el aspecto visual del ecosistema</p>
              </header>
              <div class="branding-grid">
                <div class="brand-item">
                  <label>Logo del Sistema</label>
                  <div class="uploader-box">
                    <i-lucide name="palette" class="upload-icon"></i-lucide>
                    <span>Click para subir PNG/SVG</span>
                    <p class="help-text">Recomendado: 512x512px fondo transparente</p>
                  </div>
                </div>
                <div class="brand-item">
                  <label>Favicon</label>
                  <div class="uploader-box mini">
                    <i-lucide name="globe" class="upload-icon"></i-lucide>
                    <span>Subir .ico</span>
                  </div>
                </div>
              </div>
              <div class="actions">
                <button type="button" class="btn-primary" disabled>Actualizar Identidad (Requiere S3)</button>
              </div>
            </div>

            <!-- Tab: operations (Subscription & Bank) -->
            <div *ngSwitchCase="'operations'" class="glass-panel main-panel animate-fade-in">
              <header class="panel-header">
                <h2>Operaciones & Cobro</h2>
                <p>Reglas de facturación y datos para transferencias</p>
              </header>
              <form [formGroup]="opsForm" (ngSubmit)="saveConfig('ops')" class="panel-body">
                 <div class="config-section">
                    <h3>Reglas de Suscripción</h3>
                    <div class="form-grid">
                      <div class="form-group">
                        <label>Periodo de Gracia (Días)</label>
                        <input type="number" formControlName="gracePeriodDays">
                      </div>
                      <div class="form-group">
                        <label>Recordatorio de Pago (Horas)</label>
                        <input type="number" formControlName="reminderHours">
                      </div>
                    </div>
                 </div>

                 <div class="config-section">
                    <h3>Datos Bancarios</h3>
                    <div class="form-grid">
                      <div class="form-group">
                        <label>Banco</label>
                        <input type="text" formControlName="bankName">
                      </div>
                      <div class="form-group">
                        <label>RFC</label>
                        <input type="text" formControlName="rfc">
                      </div>
                      <div class="form-group full">
                        <label>Beneficiario</label>
                        <input type="text" formControlName="accountHolder">
                      </div>
                      <div class="form-group half">
                        <label>Cuenta</label>
                        <input type="text" formControlName="accountNumber" placeholder="10-16 dígitos" [class.invalid]="opsForm.get('accountNumber')?.invalid && opsForm.get('accountNumber')?.touched">
                        <span class="error-msg" *ngIf="opsForm.get('accountNumber')?.invalid && opsForm.get('accountNumber')?.touched">
                          Solo números (10-16 dígitos)
                        </span>
                      </div>
                      <div class="form-group half">
                        <label>CLABE</label>
                        <input type="text" formControlName="clabe" placeholder="18 dígitos" [class.invalid]="opsForm.get('clabe')?.invalid && opsForm.get('clabe')?.touched">
                        <span class="error-msg" *ngIf="opsForm.get('clabe')?.invalid && opsForm.get('clabe')?.touched">
                          Exactamente 18 dígitos
                        </span>
                      </div>
                    </div>
                 </div>
                 <div class="actions">
                    <button type="submit" class="btn-primary" [disabled]="opsForm.invalid || isSaving()">
                      <span *ngIf="!isSaving()">Actualizar Operaciones</span>
                      <span *ngIf="isSaving()" class="loading-btn">
                        <div class="spinner-xs"></div> Procesando...
                      </span>
                    </button>
                 </div>
              </form>
            </div>

            <!-- Tab: cloud -->
            <div *ngSwitchCase="'cloud'" class="glass-panel main-panel animate-fade-in">
              <header class="panel-header">
                <h2>Servicios Cloud</h2>
                <p>Configuración de infraestructura de Email y Almacenamiento</p>
              </header>
              <form [formGroup]="cloudForm" (ngSubmit)="saveConfig('cloud')" class="panel-body">
                <div class="config-section">
                  <h3>Servidor SMTP (Email)</h3>
                  <div class="form-grid">
                    <div class="form-group">
                      <label>Host</label>
                      <input type="text" formControlName="smtpHost">
                    </div>
                    <div class="form-group">
                      <label>Puerto</label>
                      <input type="number" formControlName="smtpPort">
                    </div>
                    <div class="form-group">
                      <label>Usuario</label>
                      <input type="text" formControlName="smtpUser">
                    </div>
                    <div class="form-group">
                      <label>Contraseña</label>
                      <input type="password" formControlName="smtpPass">
                    </div>
                  </div>
                </div>

                <div class="config-section">
                  <h3>Identidad del Remitente</h3>
                  <div class="form-grid">
                    <div class="form-group">
                      <label>Nombre a Mostrar</label>
                      <input type="text" formControlName="senderName" placeholder="Ej. Notificaciones CGBG">
                    </div>
                    <div class="form-group">
                      <label>Email Remitente</label>
                      <input type="email" formControlName="senderEmail" placeholder="no-reply@tuempresa.com">
                    </div>
                  </div>
                </div>
                <div class="actions">
                  <button type="button" class="btn-secondary" (click)="testEmail()" [disabled]="isTestingEmail() || cloudForm.invalid">
                    <span *ngIf="!isTestingEmail()">Probar Conexión</span>
                    <span *ngIf="isTestingEmail()" class="loading-btn">
                      <div class="spinner-xs"></div> Conectando...
                    </span>
                  </button>
                  <button type="submit" class="btn-primary" [disabled]="cloudForm.invalid || isSaving()">Guardar Infraestructura</button>
                </div>
              </form>
            </div>

            <!-- Tab: templates -->
            <div *ngSwitchCase="'templates'" class="glass-panel main-panel animate-fade-in no-padding">
              <div class="template-manager">
                <!-- Sidebar: Tipos de Plantilla -->
                <aside class="template-sidebar">
                  <div class="sidebar-section">
                    <h3>Flujos de Email</h3>
                    <div class="template-nav">
                      <button *ngFor="let type of emailTemplateTypes" 
                              class="nav-item-mini" 
                              [class.active]="activeTemplate() === type.id"
                              (click)="selectTemplate(type.id)">
                        <lucide-angular [name]="type.icon" class="icon-sm"></lucide-angular>
                        <span>{{type.label}}</span>
                      </button>
                    </div>
                  </div>

                  <div class="sidebar-section keywords">
                    <h3>Sustitución de Datos</h3>
                    <p class="section-hint">Clica para copiar etiqueta</p>
                    <div class="keyword-groups">
                      <div class="keyword-tag" 
                           *ngFor="let kw of availableKeywords"
                           [class.is-component]="kw.isComponent"
                           [title]="kw.label"
                           (click)="copyToClipboard('{{' + kw.key + '}}')">
                        <i-lucide *ngIf="kw.isComponent" name="layers" class="k-icon"></i-lucide>
                        {{'{{' + kw.key + '}}'}}
                      </div>
                    </div>
                  </div>
                </aside>

                <!-- Área Principal del Editor -->
                <div class="template-editor-area">
                  <header class="editor-header">
                    <div class="title-group">
                      <h2>{{ getCurrentTemplateLabel() }}</h2>
                      <p>Personaliza el cuerpo del mensaje para este flujo</p>
                    </div>
                    <div class="header-actions">
                      <button class="btn-secondary btn-sm" (click)="previewEmail()" [disabled]="isSaving()">
                        <i-lucide name="eye" class="icon-sm"></i-lucide> Previsualizar
                      </button>
                      <button class="btn-secondary btn-sm" (click)="sendTestEmail()" [disabled]="isSaving() || isTestingEmail()">
                        <i-lucide name="mail" class="icon-sm" *ngIf="!isTestingEmail()"></i-lucide>
                        <div class="spinner-xs icon-sm" *ngIf="isTestingEmail()" style="border-top-color: #4A8E8A;"></div>
                        Enviar Prueba
                      </button>
                    </div>
                  </header>

                  <div class="editor-sub-header">
                    <div class="form-group full">
                      <label>Asunto del Correo</label>
                      <input type="text" [(ngModel)]="currentSubject" placeholder="Escribe el asunto del email...">
                    </div>
                  </div>

                  <div class="editor-workspace">
                    <div #templateEditor class="template-quill"></div>
                  </div>

                  <footer class="editor-footer">
                    <div class="status-info">
                       <lucide-angular name="info" class="icon-xs"></lucide-angular> El diseño de Header/Footer es automático.
                    </div>
                    <button class="btn-primary" (click)="saveTemplate()" [disabled]="isSaving()">
                      Guardar Cambios
                    </button>
                  </footer>
                </div>
              </div>
            </div>

            <!-- Tab: legal -->
            <div *ngSwitchCase="'legal'" class="glass-panel main-panel animate-fade-in">
              <header class="panel-header">
                <h2>Aspectos Legales y SEO</h2>
                <p>Gestiona políticas legales y visibilidad en buscadores</p>
              </header>

              <div class="legal-container">
                <!-- Segmented Control (Pills) -->
                <div class="segmented-control">
                  <button type="button" 
                          [class.active]="activeLegalTab() === 'privacy'" 
                          (click)="setLegalTab('privacy')">
                    Privacidad
                  </button>
                  <button type="button" 
                          [class.active]="activeLegalTab() === 'terms'" 
                          (click)="setLegalTab('terms')">
                    Términos
                  </button>
                  <button type="button" 
                          [class.active]="activeLegalTab() === 'seo'" 
                          (click)="setLegalTab('seo')">
                    SEO & Analytics
                  </button>
                </div>

                <form [formGroup]="legalForm" (ngSubmit)="saveConfig('legal')" class="panel-body">
                  <div [ngSwitch]="activeLegalTab()" class="legal-tab-content">
                    
                    <!-- Sub-tab: privacy -->
                    <div *ngSwitchCase="'privacy'" class="animate-fade-in">
                      <div class="form-group full">
                        <label>Aviso de Privacidad</label>
                        <p class="field-hint">Este texto se mostrará en el pie de página de tu sitio público.</p>
                        <div class="editor-container">
                          <div #privacyEditor class="premium-editor"></div>
                        </div>
                      </div>
                    </div>

                    <!-- Sub-tab: terms -->
                    <div *ngSwitchCase="'terms'" class="animate-fade-in">
                      <div class="form-group full">
                        <label>Términos y Condiciones</label>
                        <p class="field-hint">Define las reglas de uso para tus clientes y usuarios finales.</p>
                        <div class="editor-container">
                          <div #termsEditor class="premium-editor"></div>
                        </div>
                      </div>
                    </div>

                    <!-- Sub-tab: seo -->
                    <div *ngSwitchCase="'seo'" class="animate-fade-in">
                      <div class="form-grid">
                        <div class="form-group full">
                          <label>Google Analytics ID</label>
                          <input type="text" formControlName="gaId" placeholder="G-XXXXXXXXXX" [class.invalid]="legalForm.get('gaId')?.invalid && legalForm.get('gaId')?.touched">
                          <span class="error-msg" *ngIf="legalForm.get('gaId')?.invalid && legalForm.get('gaId')?.touched">
                            Formato inválido (Ej. G-XXXXXXXXXX)
                          </span>
                          <p class="field-hint">Introduce tu ID de medición para rastrear visitas de forma global.</p>
                        </div>
                      </div>
                    </div>

                  </div>

                  <div class="actions">
                    <button type="submit" class="btn-primary" [disabled]="legalForm.invalid || isSaving()">
                      <span *ngIf="!isSaving()">Actualizar Configuración Legal</span>
                      <span *ngIf="isSaving()" class="loading-btn">
                        <div class="spinner-xs"></div> Guardando...
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          
          <!-- Tab: integrations -->
          <div *ngSwitchCase="'integrations'" class="glass-panel main-panel animate-fade-in">
            <header class="panel-header">
              <h2>Integraciones API</h2>
              <p>Gestiona las llaves de servicios de terceros y seguridad global</p>
            </header>
            <form [formGroup]="integrationsForm" (ngSubmit)="saveConfig('integrations')" class="panel-body">
              <div class="config-section">
                <div class="section-title-premium">
                  <div class="icon-orb">
                    <i-lucide name="shield-check"></i-lucide>
                  </div>
                  <div class="title-details">
                    <h3>Cloudflare Turnstile</h3>
                    <p>Protección contra spam y tráfico malicioso automatizado</p>
                  </div>
                </div>

                <div class="form-grid">
                  <div class="form-group">
                    <label>Site Key (Pública)</label>
                    <div class="input-with-icon">
                      <i-lucide name="key" class="input-icon-left"></i-lucide>
                      <input type="text" formControlName="turnstileSiteKey" placeholder="0x4AAAAAA...">
                    </div>
                    <p class="field-hint">Esta llave se utiliza en el frontend para renderizar el widget.</p>
                  </div>
                  <div class="form-group">
                    <label>Secret Key (Privada)</label>
                    <div class="input-with-icon">
                      <i-lucide name="shield-check" class="input-icon-left"></i-lucide>
                      <input type="password" formControlName="turnstileSecretKey" placeholder="••••••••••••••••">
                    </div>
                    <p class="field-hint">Nunca compartas esta llave. Se usa exclusivamente para la validación en servidor.</p>
                  </div>
                </div>
              </div>

              <div class="actions">
                <button type="submit" class="btn-primary" [disabled]="integrationsForm.invalid || isSaving()">
                  <span *ngIf="!isSaving()">Guardar Integraciones</span>
                  <span *ngIf="isSaving()" class="loading-btn">
                    <div class="spinner-xs"></div> Procesando...
                  </span>
                </button>
              </div>
            </form>
          </div>
          </div>
        </main>
      </div>

      <!-- Preview Modal -->
      <div class="preview-overlay animate-fade-in" *ngIf="showPreview()">
        <div class="preview-modal glass-panel">
          <header class="preview-header">
            <div class="header-info">
              <h3>Vista Previa: {{ getCurrentTemplateLabel() }}</h3>
              <p>Así es como el destinatario verá este correo</p>
            </div>
            <button class="btn-close" (click)="closePreview()">
              <i-lucide name="x"></i-lucide>
            </button>
          </header>
          <div class="preview-body">
            <div class="preview-meta">
              <div class="meta-row">
                <span class="label">Asunto:</span>
                <span class="value">{{ currentSubject || '(Sin asunto)' }}</span>
              </div>
              <div class="meta-row">
                <span class="label">Para:</span>
                <span class="value">{{ '{' + '{user_email}' + '}' }}</span>
              </div>
            </div>
            <div class="preview-frame-header">
              <button class="btn-text-link" (click)="openInNewWindow()">
                <i-lucide name="external-link" class="icon-xs"></i-lucide> Abrir en pantalla completa 
              </button>
            </div>
            <div class="preview-frame-container">
              <!-- Loading Spinner for Preview -->
              <div class="preview-loader" *ngIf="isPreviewLoading()">
                <div class="spinner-lg"></div>
                <p>Renderizando diseño corporativo...</p>
              </div>
              <iframe [srcdoc]="safePreviewHtml()" class="preview-iframe" [class.hidden]="isPreviewLoading()"></iframe>
            </div>
          </div>
          <footer class="preview-footer">
            <p><i-lucide name="info" class="icon-xs"></i-lucide> Los datos dinámicos están simulados para esta vista.</p>
            <button class="btn-primary btn-sm" (click)="closePreview()">Cerrar Vista Previa</button>
          </footer>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .saas-config { padding: 2.5rem; max-width: 1600px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column; background: #FAFCFB; }
    
    /* Quill Editor Customizations */
    .template-quill {
      height: 400px;
      background: white;
      border-bottom-left-radius: 12px;
      border-bottom-right-radius: 12px;
    }
    ::ng-deep .ql-toolbar {
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
      background: #f8fafc;
      border-color: rgba(45, 74, 71, 0.1) !important;
    }
    ::ng-deep .ql-container {
      border-color: rgba(45, 74, 71, 0.1) !important;
      font-family: 'Inter', sans-serif;
      font-size: 15px;
    }
    ::ng-deep .ql-editor {
      min-height: 350px;
    }

    .page-header { margin-bottom: 2rem; flex-shrink: 0; }
    .page-header h1 { font-family: 'Outfit', sans-serif; font-size: 2.4rem; color: #1A3E3B; margin: 0; font-weight: 800; }
    .page-header p { color: #667A78; font-size: 1.1rem; margin-top: 4px; }

    .config-layout { display: block; flex: 1; min-height: 0; }

    .sidebar-footer { padding-top: 2rem; border-top: 1px solid #F0F7F5; }
    .system-status { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; font-weight: 600; color: #667A78; }
    .status-indicator { width: 8px; height: 8px; border-radius: 50%; position: relative; }
    .status-indicator.online { background: #4ADE80; box-shadow: 0 0 10px rgba(74, 222, 128, 0.5); }
    .status-indicator.online:after {
      content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      border-radius: 50%; background: #4ADE80; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
    }
    @keyframes ping { 75%, 100% { transform: scale(2.5); opacity: 0; } }

    .config-main { overflow-y: visible; height: auto; }
    .main-panel { border-radius: 32px; background: white; border: 1px solid #E8F0ED; box-shadow: 0 10px 40px rgba(0,0,0,0.03); overflow: visible; display: flex; flex-direction: column; }
    .main-panel.no-padding { padding: 0; }
    .main-panel:not(.no-padding) { padding: 2.5rem; }
    
    .panel-header { margin-bottom: 2.5rem; border-bottom: 2px solid #F0F7F5; padding-bottom: 1.5rem; }
    .panel-header h2 { font-family: 'Outfit', sans-serif; font-size: 1.85rem; color: #1A3E3B; margin: 0; }
    .panel-header p { color: #889; margin-top: 6px; }

    .panel-body { flex: 1; display: flex; flex-direction: column; gap: 2.5rem; }

    /* Template Manager Layout */
    .template-manager { display: grid; grid-template-columns: 320px 1fr; min-height: 750px; background: white; border-radius: 32px; overflow: hidden; border: 1px solid #E8F0ED; }
    
    .template-sidebar { background: #F9FBFA; border-right: 1px solid #E8F0ED; padding: 2rem; display: flex; flex-direction: column; gap: 2.5rem; overflow-y: auto; }
    .sidebar-section h3 { font-size: 0.85rem; font-weight: 800; color: #4A8E8A; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1.5rem; }
    
    .template-nav { display: flex; flex-direction: column; gap: 8px; }
    .nav-item-mini { 
      display: flex; align-items: center; gap: 12px; padding: 14px 18px; border: 1px solid transparent; background: white;
      border-radius: 16px; color: #445; cursor: pointer; transition: all 0.25s; font-size: 0.9rem; font-weight: 500; text-align: left;
    }
    .nav-item-mini:hover { border-color: #4A8E8A; color: #4A8E8A; background: #F0F7F5; }
    .nav-item-mini.active { background: #4A8E8A; color: white; border-color: #4A8E8A; box-shadow: 0 4px 12px rgba(74,142,138,0.2); }
    .icon-sm { width: 18px; height: 18px; }

    .keywords .section-hint { font-size: 0.75rem; color: #99A; margin-top: -1rem; margin-bottom: 1.2rem; }
    .keyword-groups { display: flex; flex-wrap: wrap; gap: 8px; }
    .keyword-tag { 
      padding: 8px 14px; background: white; border: 1px solid #E0EAE6; border-radius: 12px; font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem; color: #2D4A47; cursor: pointer; transition: all 0.25s; display: flex; align-items: center; gap: 6px;
    }
    .keyword-tag:hover { background: #E8F2EF; border-color: #4A8E8A; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
    .keyword-tag.is-component { 
      background: #E8F2EF; color: #1A3E3B; border: 1.5px solid #C0DED6; font-weight: 700;
      padding-left: 12px;
    }
    .keyword-tag.is-component:hover { background: #2D4A47; color: white; border-color: #2D4A47; }
    .k-icon { width: 12px; height: 12px; opacity: 0.7; margin-right: 8px; }

    .template-editor-area { display: flex; flex-direction: column; min-width: 0; background: white; }
    .editor-header { padding: 2rem 2.5rem; border-bottom: 1px solid #F0F7F5; display: flex; justify-content: space-between; align-items: center; }
    .editor-header h2 { font-family: 'Outfit', sans-serif; font-size: 1.5rem; color: #1A3E3B; margin: 0; }
    .editor-header p { font-size: 0.9rem; color: #889; margin: 4px 0 0 0; }
    
    .editor-sub-header { padding: 1.5rem 2.5rem; background: #FDFEFE; border-bottom: 1px solid #F0F7F5; }
    .editor-workspace { flex: 1; padding: 1rem 2.5rem; min-height: 0; }
    .template-quill { height: 400px; }

    .editor-footer { padding: 1.5rem 2.5rem; border-top: 1px solid #F0F7F5; display: flex; justify-content: space-between; align-items: center; background: #FDFEFE; }
    .status-info { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #667A78; font-style: italic; }
    .icon-xs { width: 14px; height: 14px; }

    /* Forms Premium Styling */
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
    .form-group { display: flex; flex-direction: column; gap: 10px; }
    .form-group.full { grid-column: 1 / -1; }
    .form-group.half { grid-column: span 1; }
    .form-group label { font-size: 0.9rem; font-weight: 700; color: #2D4A47; }
    .form-group input, .form-group select { 
      padding: 16px; border: 1px solid #E0EAE6; border-radius: 16px; font-size: 1rem; color: #333; transition: all 0.25s; background: #FAFAFA; width: 100%;
    }
    .form-group input:focus { border-color: #4A8E8A; outline: none; background: white; box-shadow: 0 0 0 5px rgba(74,142,138,0.08); }

    /* Maintenance Toggle Switch */
    .maintenance-toggle { margin-top: 1rem; border: 1px solid #F0F7F5; padding: 1.5rem; border-radius: 20px; background: #FAFCFB; }
    .toggle-label { 
      display: flex; align-items: center; justify-content: space-between; 
      width: 100%; cursor: pointer; padding: 4px 0;
    }
    .toggle-label span:first-child { font-size: 1rem; font-weight: 700; color: #1A3E3B; }
    .toggle-label input { display: none; }
    .slider { 
      width: 52px; height: 28px; background: #E0EAE6; border-radius: 34px; 
      position: relative; transition: .4s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid #D1E1DC;
    }
    .slider:before { 
      content: ""; position: absolute; height: 20px; width: 20px; left: 3px; bottom: 3px; 
      background: white; border-radius: 50%; transition: .4s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    input:checked + .slider { background: #2D4A47; border-color: #2D4A47; }
    input:checked + .slider:before { transform: translateX(24px); }
    .help-text { font-size: 0.85rem; color: #667A78; margin-top: 8px; font-weight: 500; }

    .actions { 
      margin-top: 3rem; 
      padding-top: 2rem; 
      border-top: 1px solid #F0F7F5; 
      display: flex; 
      justify-content: flex-end; 
      gap: 1rem; 
    }

    .btn-primary { 
      padding: 16px 36px; background: #2D4A47; color: white; border: none; border-radius: 18px; 
      font-weight: 700; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); font-size: 1rem;
      display: flex; align-items: center; gap: 10px;
    }
    .btn-primary:hover:not(:disabled) { background: #1A3E3B; transform: translateY(-3px); box-shadow: 0 10px 25px rgba(45,74,71,0.2); }
    
    .btn-secondary { 
      padding: 12px 24px; background: #F0F7F5; color: #4A8E8A; border: 1px solid #E0EAE6; border-radius: 16px;
      font-weight: 600; cursor: pointer; transition: all 0.25s; display: flex; align-items: center; gap: 8px;
    }
    .btn-secondary:hover { background: #E8F2EF; transform: translateY(-2px); }

    .animate-fade-in { animation: fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
    
    /* Segmented Control & Legal Sub-tabs */
    .legal-container { display: flex; flex-direction: column; gap: 2rem; }
    .segmented-control { 
      display: flex; background: #F0F7F5; padding: 6px; border-radius: 20px; align-self: flex-start;
      border: 1px solid #E0EAE6; gap: 4px; width: auto;
    }
    .segmented-control button {
      padding: 10px 24px; border: none; background: transparent; border-radius: 16px;
      color: #667A78; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.25s;
    }
    .segmented-control button.active { background: white; color: #2D4A47; box-shadow: 0 4px 12px rgba(45,74,71,0.08); }
    .segmented-control button:hover:not(.active) { color: #4A8E8A; }

    .premium-editor { height: 500px; border-radius: 0 0 16px 16px; border-color: #E0EAE6 !important; }
    .editor-container { border-radius: 16px; overflow: hidden; border: 1px solid #E0EAE6; }
    .field-hint { font-size: 0.85rem; color: #889; margin: -5px 0 10px 0; }

    .error-msg { font-size: 0.75rem; color: #E57373; font-weight: 600; margin-top: -6px; margin-bottom: 4px; display: block; }
    input.invalid, select.invalid { border-color: #E57373 !important; background: #FFF9F9 !important; }
    input.invalid:focus { box-shadow: 0 0 0 5px rgba(229, 115, 115, 0.08) !important; }

    .loading-btn { display: flex; align-items: center; gap: 10px; }
    .spinner-xs { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
    .spinner-lg { width: 48px; height: 48px; border: 4px solid #F0F7F5; border-top-color: #2D4A47; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem; }
    
    @keyframes spin { to { transform: rotate(360deg); } }

    .preview-loader { 
      position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.9); z-index: 10;
      color: #667A78; font-weight: 500; font-size: 0.95rem;
    }
    .preview-iframe.hidden { visibility: hidden; pointer-events: none; }
    .preview-frame-container { position: relative; flex: 1; background: white; border: 1px solid #E8F0ED; border-radius: 16px; overflow: hidden; min-height: 500px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }

    .preview-frame-header { padding: 0.5rem 1rem; background: #F8FAFB; border-top-left-radius: 16px; border-top-right-radius: 16px; border-bottom: 1px solid #E8F0ED; display: flex; justify-content: flex-end; }
    .btn-text-link { background: none; border: none; color: #4A8E8A; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 8px; transition: all 0.2s; }
    .btn-text-link:hover { background: #E8F2EF; color: #2D4A47; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #E0EAE6; border-radius: 10px; }
    * { box-sizing: border-box; }

    /* Modal Preview Styles */
    .preview-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(45, 74, 71, 0.4); backdrop-filter: blur(12px);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
      padding: 40px;
    }
    .preview-modal {
      width: 100%; max-width: 900px; height: 100%; max-height: 850px;
      display: flex; flex-direction: column; padding: 0 !important; overflow: hidden;
    }
    .preview-header {
      padding: 1.5rem 2.5rem; border-bottom: 1px solid #F0F7F5;
      display: flex; justify-content: space-between; align-items: center; background: white;
    }
    .preview-header h3 { font-family: 'Outfit', sans-serif; font-size: 1.4rem; color: #1A3E3B; margin: 0; }
    .preview-header p { font-size: 0.9rem; color: #889; margin: 4px 0 0 0; }
    .btn-close {
      background: #F0F7F5; border: none; width: 40px; height: 40px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center; color: #4A8E8A; cursor: pointer; transition: all 0.2s;
    }
    .btn-close:hover { background: #E0EAE6; color: #1A3E3B; transform: rotate(90deg); }
    
    .preview-body { flex: 1; padding: 2rem 2.5rem; background: #FAFAFA; overflow-y: auto; display: flex; flex-direction: column; gap: 1.5rem; }
    .preview-meta { padding: 1rem 1.5rem; background: white; border: 1px solid #E8F0ED; border-radius: 16px; display: flex; flex-direction: column; gap: 8px; }
    .meta-row { display: flex; gap: 12px; font-size: 0.9rem; }
    .meta-row .label { font-weight: 700; color: #4A8E8A; width: 60px; }
    .meta-row .value { color: #333; }

    .preview-frame-container { flex: 1; background: white; border: 1px solid #E8F0ED; border-radius: 16px; overflow: hidden; min-height: 500px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
    .preview-iframe { width: 100%; height: 100%; border: none; }

    .preview-footer { padding: 1.5rem 2.5rem; border-top: 1px solid #F0F7F5; background: white; display: flex; justify-content: space-between; align-items: center; }

    /* Integrations Premium Styles */
    .section-title-premium { display: flex; align-items: center; gap: 20px; margin-bottom: 2.5rem; padding: 20px; background: #F8FAFB; border-radius: 24px; border: 1px solid #E8F0ED; }
    .icon-orb { 
      width: 56px; height: 56px; background: #2D4A47; color: white; border-radius: 20px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      box-shadow: 0 8px 16px rgba(45,74,71,0.2);
    }
    .icon-orb i-lucide { width: 28px; height: 28px; }
    .title-details h3 { font-size: 1.25rem; color: #1A3E3B; margin: 0; font-family: 'Outfit', sans-serif; font-weight: 700; }
    .title-details p { font-size: 0.9rem; color: #667A78; margin: 4px 0 0 0; }

    .input-with-icon { position: relative; display: flex; align-items: center; }
    .input-icon-left { position: absolute; left: 18px; width: 18px; height: 18px; color: #4A8E8A; pointer-events: none; opacity: 0.7; }
    .input-with-icon input { padding-left: 52px !important; }
    @media (max-width: 1024px) {
      .template-manager { grid-template-columns: 1fr; height: auto; }
      .template-sidebar { border-right: none; border-bottom: 2px solid #F0F7F5; padding: 1.5rem; }
      .template-nav { 
        display: flex;
        flex-direction: column; 
        gap: 10px;
        background: #F0F7F5;
        padding: 1rem;
        border-radius: 20px;
      }
      .nav-item-mini { 
        width: 100%;
        justify-content: flex-start;
      }
    }

    @media (max-width: 768px) {
      .saas-config { padding: 1.25rem; }
      .page-header h1 { font-size: 1.8rem; }
      
      .main-panel:not(.no-padding) { padding: 1.5rem; border-radius: 24px; }
      .panel-header { margin-bottom: 1.5rem; }
      .panel-header h2 { font-size: 1.5rem; }
      
      .form-grid { grid-template-columns: 1fr; gap: 1.25rem; }
      
      .segmented-control { width: 100%; flex-direction: column; border-radius: 24px; }
      .segmented-control button { width: 100%; }

      .actions { flex-direction: column; padding-top: 1.5rem; margin-top: 2rem; }
      .btn-primary, .btn-secondary { width: 100%; justify-content: center; }
      
      .preview-modal { width: 95%; height: 95%; max-height: 95%; }
      .preview-overlay { padding: 15px; }
      .preview-body { padding: 1.25rem; }
      
      .template-quill { height: 350px; }
      .editor-header { flex-direction: column; align-items: flex-start; gap: 1rem; padding: 1.5rem; }
      .editor-sub-header, .editor-workspace, .editor-footer { padding: 1.25rem; }
      .editor-footer { flex-direction: column; gap: 1rem; }
      .status-info { text-align: center; }
    }
  `]
})
export class SaasConfigComponent implements OnInit, AfterViewInit, OnDestroy {
  private saasService = inject(SuperAdminService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);
  private sanitizer = inject(DomSanitizer);

  @ViewChild('termsEditor') termsEl!: ElementRef;
  @ViewChild('privacyEditor') privacyEl!: ElementRef;
  @ViewChild('templateEditor') templateEl!: ElementRef;

  private quills: Record<string, any> = {};
  
  activeTab = signal<ConfigTab>('general');
  activeLegalTab = signal<'privacy' | 'terms' | 'seo'>('privacy');
  isSaving = signal(false);
  isTestingEmail = signal(false);
  isPreviewLoading = signal(false);

  // Template Management
  availableKeywords = [
    { key: 'user_name', label: 'Nombre Destinatario' },
    { key: 'user_email', label: 'Email Destinatario' },
    { key: 'business_name', label: 'Negocio/Tenant' },
    { key: 'prospect_name', label: 'Nombre Prospecto' },
    { key: 'prospect_email', label: 'Email Prospecto' },
    { key: 'prospect_phone', label: 'Teléfono Prospecto' },
    { key: 'package_name', label: 'Paquete Seleccionado' },
    { key: 'negotiated_price', label: 'Precio Negociado' },
    { key: 'months_count', label: 'Vigencia (Meses)' },
    { key: 'bank_name', label: 'Banco' },
    { key: 'clabe', label: 'Cuenta CLABE' },
    { key: 'reference', label: 'Referencia' },
    { key: 'magic_link', label: 'Enlace Mágico' },
    { key: 'system_name', label: 'Nombre Sistema' },
    { key: 'appointment_date', label: 'Fecha Cita' },
    { key: 'appointment_time', label: 'Hora Cita' },
    { key: 'service_name', label: 'Servicio' },
    { key: 'payment_amount', label: 'Monto Pago' },
    // Structural Components
    { key: 'action_button', label: 'Botón de Acción', isComponent: true },
    { key: 'appointment_summary', label: 'Resumen de Cita (Tabla)', isComponent: true },
    { key: 'payment_summary', label: 'Resumen de Pago (Diseño)', isComponent: true }
  ];

  // Master Templates (Tone: Formal/Professional)
  private readonly MASTER_TEMPLATES: Record<string, { subject: string; body: string }> = {
    'activation': {
      subject: 'Activación de Cuenta Corporativa - {{system_name}}',
      body: `
        <h2 style="color: #1A3E3B;">Bienvenido a la Plataforma</h2>
        <p>Estimado(a) {{user_name}},</p>
        <p>Le damos la más cordial bienvenida a <strong>{{system_name}}</strong>. Hemos recibido su solicitud de registro y su cuenta ha sido creada exitosamente.</p>
        <p>Para garantizar la seguridad de su información y activar sus credenciales de acceso, es necesario que confirme su dirección de correo electrónico:</p>
        {{action_button}}
        <p style="margin-top: 30px; border-top: 1px solid #E2E8F0; padding-top: 20px; font-size: 13px; color: #64748B;">
          Atentamente,<br><strong>Departamento de Seguridad - {{system_name}}</strong>
        </p>
      `
    },
    'appointment-requested': {
      subject: 'Solicitud de Servicio Recibida - {{system_name}}',
      body: `
        <h2 style="color: #1A3E3B;">Notificación de Solicitud</h2>
        <p>Estimado(a) {{user_name}},</p>
        <p>Le informamos que hemos recibido satisfactoriamente su solicitud de reservación para el servicio: <strong>{{service_name}}</strong>.</p>
        <p>Nuestro equipo operativo está revisando la disponibilidad para la fecha solicitada. Recibirá un correo de confirmación en un plazo no mayor a 24 horas.</p>
        <p>Agradecemos su preferencia.</p>
      `
    },
    'appointment-confirmation': {
      subject: 'Confirmación de Cita Programada - {{system_name}}',
      body: `
        <h2 style="color: #1A3E3B;">Cita Confirmada</h2>
        <p>Estimado(a) {{user_name}},</p>
        <p>Es un placer informarle que su cita ha sido <strong>confirmada y agendada</strong> en nuestro sistema operativo.</p>
        <p>A continuación se presentan los detalles de su atención:</p>
        {{appointment_summary}}
        <p>Le recomendamos presentarse 10 minutos antes de la hora programada. Esperamos verle pronto.</p>
      `
    },
    'appointment-cancelled': {
      subject: 'Cancelación de Servicio - {{system_name}}',
      body: `
        <h2 style="color: #E11D48;">Aviso de Cancelación</h2>
        <p>Estimado(a) {{user_name}},</p>
        <p>Le informamos formalmente que su cita programada para el servicio <strong>{{service_name}}</strong> ha sido cancelada.</p>
        <p>Si esta cancelación fue un error o desea reprogramar su atención, le invitamos a realizar una nueva solicitud a través de nuestro portal oficial.</p>
        <p>Lamentamos los inconvenientes que esto pueda ocasionarle.</p>
      `
    },
    'appointment-rescheduled': {
      subject: 'Actualización de Agenda: Cita Reprogramada - {{system_name}}',
      body: `
        <h2 style="color: #1A3E3B;">Reprogramación de Cita</h2>
        <p>Estimado(a) {{user_name}},</p>
        <p>Le notificamos que su cita ha sido <strong>reprogramada</strong> exitosamente. Por favor, tome nota de los nuevos detalles de su atención:</p>
        {{appointment_summary}}
        <p>Los demás detalles del servicio permanecen sin cambios. Agradecemos su comprensión.</p>
      `
    },
    'payment-receipt': {
      subject: 'Comprobante Electrónico de Operación - {{system_name}}',
      body: `
        <h2 style="color: #1A3E3B;">Confirmación de Pago</h2>
        <p>Estimado(a) {{user_name}},</p>
        <p>Agradecemos su confianza en nuestros servicios. Confirmamos que hemos recibido satisfactoriamente su pago correspondiente a la suscripción de su cuenta:</p>
        {{payment_summary}}
        <p>Este documento sirve como comprobante electrónico de la operación. Gracias por ser parte de {{system_name}}.</p>
      `
    },
    'express-invitation': {
      subject: 'Invitación: Configura tu acceso a {{business_name}} - {{system_name}}',
      body: `
        <h2 style="color: #1A3E3B;">¡Bienvenido a la Plataforma!</h2>
        <p>Estimado(a) {{user_name}},</p>
        <p>Has sido invitado por el administrador para gestionar el negocio <strong>{{business_name}}</strong> en nuestra plataforma SaaS.</p>
        <p>Para comenzar y tomar el control de tu panel de administración, por favor configura tu contraseña accediendo al siguiente enlace seguro (vence en 24 horas):</p>
        {{action_button}}
        <p>Si no esperabas esta invitación, puedes ignorar este correo.</p>
      `
    },
    'welcome-active': {
      subject: '¡Tu negocio ya está activo! Bienvenidos a {{system_name}}',
      body: `
        <h2 style="color: #1A3E3B;">¡Todo Listo!</h2>
        <p>Hola de nuevo {{user_name}},</p>
        <p>Tu cuenta ha sido configurada correctamente y el negocio <strong>{{business_name}}</strong> ya está activo y 100% operativo en nuestro ecosistema.</p>
        <p>A partir de este momento puedes acceder a tu dashboard, configurar tus servicios y comenzar a recibir citas.</p>
        <p>Estamos aquí para ayudarte a crecer.</p>
      `
    },
    'new-lead': {
      subject: 'Nuevo Lead: Solicitud de Registro - {{business_name}}',
      body: `
        <h2 style="color: #1A3E3B;">Nueva Solicitud Recibida</h2>
        <p>Estimado Administrador,</p>
        <p>Se ha registrado un nuevo lead interesado en la plataforma <strong>{{system_name}}</strong>:</p>
        <ul style="color: #334155; line-height: 2;">
          <li><strong>Nombre:</strong> {{prospect_name}}</li>
          <li><strong>Email:</strong> {{prospect_email}}</li>
          <li><strong>Teléfono:</strong> {{prospect_phone}}</li>
          <li><strong>Negocio:</strong> {{business_name}}</li>
        </ul>
        <p>Por favor, ingresa al panel administrativo para gestionar esta solicitud y enviar una propuesta formal.</p>
        <p>Este es un aviso automático del sistema.</p>
      `
    },
    'business-proposal': {
      subject: 'Propuesta Personalizada CitaGlam - {{business_name}}',
      body: `
        <h2 style="color: #1A3E3B;">Tu Propuesta de Negocio</h2>
        <p>Hola <strong>{{user_name}}</strong>,</p>
        <p>Ha sido un gusto conversar contigo sobre el futuro de <strong>{{business_name}}</strong>.</p>
        <p>Basándonos en tus necesidades, hemos preparado la siguiente propuesta industrial:</p>
        <ul style="color: #334155; line-height: 2;">
          <li><strong>Paquete:</strong> {{package_name}}</li>
          <li><strong>Vigencia:</strong> {{months_count}} Mes(es)</li>
          <li><strong>Inversión Total:</strong> {{negotiated_price}}</li>
        </ul>
        
        <h3 style="color: #2D4A47; margin-top: 30px;">Instrucciones para Activación</h3>
        <p>Para activar tu ecosistema digital, por favor realiza la transferencia a los siguientes datos corporativos:</p>
        <div style="background: #F8FAFC; padding: 20px; border-radius: 12px; border: 1px solid #E2E8F0; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Banco:</strong> {{bank_name}}</p>
          <p style="margin: 5px 0;"><strong>Cuenta CLABE:</strong> {{clabe}}</p>
          <p style="margin: 5px 0;"><strong>Referencia:</strong> {{reference}}</p>
        </div>
        
        <p>Una vez realizado el pago, puedes subir tu comprobante haciendo clic en el siguiente enlace seguro:</p>
        {{action_button}}
        
        <p>Quedamos a tu disposición para cualquier duda adicional.</p>
      `
    }
  };

  emailTemplateTypes = [
    { id: 'activation', label: 'Bienvenida y Activación', icon: 'zap' },
    { id: 'express-invitation', label: 'Invitación (Alta Express)', icon: 'mail' },
    { id: 'welcome-active', label: 'Bienvenida Activa', icon: 'check-circle' },
    { id: 'new-lead', label: 'Notificación de Lead', icon: 'user-plus' },
    { id: 'business-proposal', icon: 'file-text', label: 'Propuesta de Negocio' },
    { id: 'appointment-requested', label: 'Cita Solicitada', icon: 'bell' },
    { id: 'appointment-confirmation', label: 'Cita Confirmada', icon: 'shield-check' },
    { id: 'appointment-rescheduled', label: 'Cita Reprogramada', icon: 'calendar' },
    { id: 'appointment-cancelled', label: 'Cita Cancelada', icon: 'x-circle' },
    { id: 'payment-receipt', label: 'Recibo de Pago', icon: 'credit-card' }
  ];

  activeTemplate = signal('activation');
  currentSubject = '';
  templatesConfig = signal<any>({});
  showPreview = signal(false);
  previewHtml = signal<string>('');
  safePreviewHtml = computed(() => this.sanitizer.bypassSecurityTrustHtml(this.previewHtml()));

  // Forms
  generalForm: FormGroup = this.fb.group({
    systemName: ['CGBG Software', [Validators.required, Validators.maxLength(100)]],
    currency: ['MXN', [Validators.required]],
    timezone: ['America/Mexico_City', [Validators.required]],
    maintenanceMode: [false]
  });

  opsForm: FormGroup = this.fb.group({
    gracePeriodDays: [3, [Validators.required, Validators.min(0), Validators.max(30)]],
    reminderHours: [24, [Validators.required, Validators.min(0), Validators.max(168)]],
    bankName: ['', [Validators.maxLength(100)]],
    rfc: ['', [Validators.pattern(/^[A-Z&Ñ]{3,4}[0-9]{2}(0[1-9]|1[012])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{2}[0-9A]$/)]],
    accountHolder: ['', [Validators.maxLength(150)]],
    accountNumber: ['', [Validators.pattern(/^[0-9]{10,16}$/)]],
    clabe: ['', [Validators.pattern(/^[0-9]{18}$/)]]
  });

  cloudForm: FormGroup = this.fb.group({
    smtpHost: ['', [Validators.maxLength(255)]],
    smtpPort: [587, [Validators.required, Validators.min(1), Validators.max(65535)]],
    smtpUser: ['', [Validators.maxLength(255)]],
    smtpPass: ['', [Validators.maxLength(255)]],
    senderName: ['', [Validators.maxLength(100)]],
    senderEmail: ['', [Validators.required, Validators.email, Validators.maxLength(255)]]
  });

  legalForm: FormGroup = this.fb.group({
    gaId: ['', [Validators.pattern(/^(UA-\d+-\d+|G-[A-Z0-9]+)$/)]],
    terms: [''],
    privacy: ['']
  });

  integrationsForm: FormGroup = this.fb.group({
    turnstileSiteKey: [''],
    turnstileSecretKey: ['']
  });

  ngOnInit() {
    this.loadConfig();
    
    // Initial sync
    const firstChild = this.route.snapshot.firstChild;
    if (firstChild) {
      this.setTab(firstChild.routeConfig?.path as ConfigTab);
    }

    // React to route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      const activePath = this.route.snapshot.firstChild?.routeConfig?.path;
      if (activePath) {
        this.setTab(activePath as ConfigTab);
      }
    });
  }

  ngAfterViewInit() {
    // Editors are initialized on demand when tabs change
  }

  setTab(tab: ConfigTab) {
    if (!tab) return;
    this.activeTab.set(tab);
    
    // Tiny delay to ensure elements are in DOM after SwitchCase
    setTimeout(() => {
      if (tab === 'legal') {
        this.setLegalTab(this.activeLegalTab());
      } else if (tab === 'templates') {
        this.initTemplateEditor();
      }
    }, 0);
  }

  setLegalTab(tab: 'privacy' | 'terms' | 'seo') {
    this.activeLegalTab.set(tab);
    setTimeout(() => {
      if (tab === 'terms') {
        this.initEditor('terms', this.termsEl, 'terms');
      } else if (tab === 'privacy') {
        this.initEditor('privacy', this.privacyEl, 'privacy');
      }
    }, 0);
  }

  private initEditor(id: string, el: ElementRef, formControlName: string | null) {
    if (!el) return;
    
    // Always clear the old instance reference if we are re-initializing on a new DOM element
    // This fixed the bug where editor would disappear on navigation back/forth
    this.quills[id] = null;

    const quill = new Quill(el.nativeElement, {
      theme: 'snow',
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['link', 'clean']
        ]
      },
      placeholder: 'Escribe aquí...'
    });

    this.quills[id] = quill;

    if (formControlName) {
      const initialValue = this.legalForm.get(formControlName)?.value;
      if (initialValue) quill.root.innerHTML = initialValue;
    }

    quill.on('text-change', () => {
      if (formControlName) {
        this.legalForm.patchValue({
          [formControlName]: quill.root.innerHTML
        }, { emitEvent: false });
      }
    });
  }

  private initTemplateEditor() {
    // Si ya existe el elemento pero el editor no se ha creado, o si el elemento ha cambiado en el DOM
    const editorEl = this.templateEl?.nativeElement;
    if (!editorEl) return;

    // Si ya existe una instancia de Quill vinculada a este elemento exacto, no la recreamos
    if (this.quills['template']) {
      this.loadActiveTemplateContent();
      return;
    }

    const quill = new Quill(editorEl, {
      theme: 'snow',
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline'],
          [{ 'header': [1, 2, false] }],
          [{ 'color': [] }],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['link', 'clean']
        ]
      },
      placeholder: 'Personaliza el cuerpo del mensaje profesional...'
    });

    this.quills['template'] = quill;
    this.loadActiveTemplateContent();
  }

  loadConfig() {
    this.saasService.getGlobalConfig().subscribe({
      next: (config) => {
        if (!config) return;

        this.generalForm.patchValue({
          systemName: config.branding?.systemName || 'CGBG Software',
          currency: config.localization?.currency || 'MXN',
          timezone: config.localization?.timezone || 'America/Mexico_City',
          maintenanceMode: config.maintenanceMode
        });

        this.opsForm.patchValue({
          gracePeriodDays: config.gracePeriodDays,
          reminderHours: config.reminderHours,
          ...config.bankDetails
        });

        if (config.emailConfig) {
          this.cloudForm.patchValue({
            smtpHost: config.emailConfig.host,
            smtpPort: config.emailConfig.port,
            smtpUser: config.emailConfig.user,
            smtpPass: config.emailConfig.pass,
            senderName: config.emailConfig.fromName,
            senderEmail: config.emailConfig.fromEmail
          });
        }

        this.legalForm.patchValue({
          gaId: config.seo?.googleAnalyticsId,
          terms: config.legal?.termsAndConditions,
          privacy: config.legal?.privacyPolicy
        });

        this.integrationsForm.patchValue({
          turnstileSiteKey: config.security?.turnstileSiteKey || '',
          turnstileSecretKey: config.security?.turnstileSecretKey || ''
        });

        if (this.quills['terms']) this.quills['terms'].root.innerHTML = config.legal?.termsAndConditions || '';
        if (this.quills['privacy']) this.quills['privacy'].root.innerHTML = config.legal?.privacyPolicy || '';

        this.templatesConfig.set(config.emailTemplates || {});
        this.loadActiveTemplateContent();
      }
    });
  }

  selectTemplate(type: string) {
    this.activeTemplate.set(type);
    this.loadActiveTemplateContent();
  }

  loadActiveTemplateContent() {
    const config = this.templatesConfig();
    const type = this.activeTemplate();
    const current = config[type] || {};
    const master = this.MASTER_TEMPLATES[type] || { subject: '', body: '' };

    this.currentSubject = current.subject || master.subject || '';
    
    if (this.quills['template']) {
      // Si está vacío en la DB, mostramos la propuesta maestra
      this.quills['template'].root.innerHTML = current.body || master.body || '';
    }
  }

  getCurrentTemplateLabel() {
     return this.emailTemplateTypes.find(t => t.id === this.activeTemplate())?.label || 'Plantilla';
  }

  saveTemplate() {
    this.isSaving.set(true);
    const config = { ...this.templatesConfig() };
    config[this.activeTemplate()] = {
      subject: this.currentSubject,
      body: this.quills['template']?.root.innerHTML || ''
    };

    this.saasService.updateGlobalConfig({ emailTemplates: config }).subscribe({
      next: () => {
        this.templatesConfig.set(config);
        this.isSaving.set(false);
        this.notificationService.success('¡Plantilla Guardada!', 'Los cambios se han aplicado correctamente.');
      },
      error: () => {
        this.isSaving.set(false);
        this.notificationService.error('Error', 'No se pudo guardar la plantilla.');
      }
    });
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  previewEmail() {
    this.previewHtml.set('');
    this.showPreview.set(true);
    this.isPreviewLoading.set(true);
    
    const body = this.quills['template']?.root.innerHTML || '';
    
    this.saasService.getEmailPreview(body, this.currentSubject).subscribe({
      next: (res) => {
        this.previewHtml.set(res.html);
        this.isPreviewLoading.set(false);
      },
      error: () => {
        this.isPreviewLoading.set(false);
        this.showPreview.set(false);
        this.notificationService.error('Error de Previsualización', 'No se pudo generar el diseño de prueba.');
      }
    });
  }

  openInNewWindow() {
    const html = this.previewHtml();
    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    }
  }

  closePreview() {
    this.showPreview.set(false);
    this.previewHtml.set('');
  }

  async sendTestEmail() {
    const body = this.quills['template']?.root.innerHTML || '';
    
    const { value: email } = await Swal.fire({
      title: 'Enviar Prueba de Correo',
      input: 'email',
      inputLabel: 'Ingresa el correo de destino',
      inputPlaceholder: 'tu-correo@ejemplo.com',
      showCancelButton: true,
      confirmButtonText: 'Enviar ahora ✈️',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2D4A47',
      cancelButtonColor: '#CDD7D6',
      background: '#FAFCFB',
      color: '#1A3E3B'
    });

    if (email) {
      this.isTestingEmail.set(true);
      this.saasService.sendTestTemplate(email, this.currentSubject, body).subscribe({
        next: (res) => {
          this.isTestingEmail.set(false);
          this.notificationService.success('Prueba Enviada', `Hemos enviado el correo a ${email}. Verifica tu bandeja.`);
        },
        error: (err) => {
          this.isTestingEmail.set(false);
          this.notificationService.error('Error de Envío', 'No se pudo enviar el correo de prueba. Revisa la configuración SMTP.');
        }
      });
    }
  }

  saveConfig(type: string) {
    this.isSaving.set(true);
    let payload: any = {};
    let form: FormGroup;

    switch (type) {
      case 'general':
        form = this.generalForm;
        payload = {
          branding: { systemName: form.value.systemName },
          localization: {
            currency: form.value.currency,
            timezone: form.value.timezone
          },
          maintenanceMode: form.value.maintenanceMode
        };
        break;
      case 'ops':
        form = this.opsForm;
        payload = {
          gracePeriodDays: form.value.gracePeriodDays,
          reminderHours: form.value.reminderHours,
          bankDetails: {
            bankName: form.value.bankName,
            rfc: form.value.rfc,
            accountHolder: form.value.accountHolder,
            accountNumber: form.value.accountNumber,
            clabe: form.value.clabe
          }
        };
        break;
      case 'cloud':
        form = this.cloudForm;
        payload = {
          emailConfig: {
            host: form.value.smtpHost,
            port: form.value.smtpPort,
            user: form.value.smtpUser,
            pass: form.value.smtpPass,
            fromName: form.value.senderName,
            fromEmail: form.value.senderEmail
          }
        };
        break;
      case 'legal':
        form = this.legalForm;
        payload = {
          seo: { googleAnalyticsId: form.value.gaId },
          legal: { 
            termsAndConditions: form.value.terms,
            privacyPolicy: form.value.privacy
          }
        };
        break;
      case 'integrations':
        form = this.integrationsForm;
        payload = {
          security: {
            turnstileSiteKey: form.value.turnstileSiteKey,
            turnstileSecretKey: form.value.turnstileSecretKey
          }
        };
        break;
      default:
        this.isSaving.set(false);
        return;
    }

    this.saasService.updateGlobalConfig(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notificationService.success(
          '¡Actualizado!',
          'La configuración se ha guardado correctamente.',
        );
      },
      error: () => {
        this.isSaving.set(false);
        this.notificationService.error(
          'Error',
          'No se pudo actualizar la configuración.',
        );
      },
    });
  }

  testEmail() {
    if (this.cloudForm.invalid) {
      this.notificationService.error(
        'Datos Incompletos',
        'Por favor completa los campos del servidor SMTP para realizar la prueba.',
      );
      return;
    }

    this.isTestingEmail.set(true);
    const val = this.cloudForm.value;
    const config = {
      host: val.smtpHost,
      port: val.smtpPort,
      user: val.smtpUser,
      pass: val.smtpPass,
      fromName: val.senderName,
      fromEmail: val.senderEmail,
    };

    this.saasService.testEmailConfig(config).subscribe({
      next: (res) => {
        this.isTestingEmail.set(false);
        this.notificationService.success('¡Conexión Exitosa!', res.message);
        // Reload to sync any other fields if needed, 
        // although emailConfig is already in the form
        this.loadConfig();
      },
      error: (err) => {
        this.isTestingEmail.set(false);
        this.notificationService.error(
          'Fallo de Conexión',
          err.error?.message ||
            'No se pudo establecer conexión con el servidor SMTP.',
        );
      },
    });
  }


  ngOnDestroy() {
    // Limpieza de instancias
    Object.values(this.quills).forEach(q => {
      try { q.off('text-change'); } catch(e) {}
    });
    this.quills = {};
  }
}
