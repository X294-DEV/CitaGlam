import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LucideAngularModule, Upload, CheckCircle, ArrowLeft, Image as ImageIcon, X, FileText, AlertTriangle } from 'lucide-angular';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-upload-request-payment',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="upload-container">
      <div class="upload-card glass-panel shadow-premium">
        <header class="card-header">
          <div class="brand-logo">
            <img src="brand/citaglam-login.png" alt="CitaGlam">
          </div>
          <h1>Confirmar Pago</h1>
          <p>Sube tu comprobante de transferencia para activar tu cuenta.</p>
          
          <div class="rejection-alert" *ngIf="rejectionReason()">
            <div class="alert-icon"><i-lucide name="alert-triangle"></i-lucide></div>
            <div class="alert-content">
              <strong>Atención: Su pago anterior fue rechazado</strong>
              <p>{{ rejectionReason() }}</p>
            </div>
          </div>
        </header>

        <div class="upload-body" *ngIf="!isSuccess() && !isLoadingRequest()">
          <div class="file-uploader" [class.dragging]="isDragging" 
               (dragover)="onDragOver($event)" 
               (dragleave)="onDragLeave($event)" 
               (drop)="onDrop($event)">
            <input type="file" #fileInput (change)="onFileSelected($event)" 
                   accept="image/*,application/pdf" style="display: none">
            
            <div class="uploader-content" *ngIf="!previewUrl()">
              <div class="icon-circle">
                <i-lucide name="upload"></i-lucide>
              </div>
              <h3>Arrastra tu comprobante aquí</h3>
              <p>Formatos permitidos: JPG, PNG, WEBP, PDF, HEIC, GIF, BMP y TIFF.</p>
              <button class="btn-browse" (click)="fileInput.click()">Seleccionar Archivo</button>
            </div>

            <div class="preview-content" *ngIf="previewUrl()">
              <!-- Image Preview -->
              <img *ngIf="!isPdf()" [src]="previewUrl()" alt="Vista Previa">
              
              <!-- PDF Placeholder -->
              <div *ngIf="isPdf()" class="pdf-preview">
                <i-lucide name="file-text" class="icon-lg"></i-lucide>
                <span>Documento PDF Cargado</span>
              </div>

              <button class="btn-remove" (click)="removeFile()">
                <i-lucide name="x" class="icon-xs"></i-lucide>
              </button>
            </div>
          </div>

          <p class="format-help">Máximo 10MB. Asegúrate de que los datos sean legibles.</p>

          <div class="actions" *ngIf="previewUrl()">
            <button class="btn-submit" [disabled]="isUploading()" (click)="submit()">
              <span *ngIf="!isUploading()">Enviar Comprobante</span>
              <span *ngIf="isUploading()">Subiendo...</span>
            </button>
            <button class="btn-cancel" (click)="removeFile()">Cancelar</button>
          </div>
        </div>

        <div class="loading-request" *ngIf="isLoadingRequest()">
           <div class="spinner"></div>
           <p>Validando estado de solicitud...</p>
        </div>

        <div class="success-state" *ngIf="isSuccess() && !isLoadingRequest()">
          <div class="success-icon" [class.already]="alreadyUploaded()">
            <i-lucide name="check-circle"></i-lucide>
          </div>
          <h2>{{ alreadyUploaded() ? 'Pago en Revisión' : '¡Recibido con éxito!' }}</h2>
          <p *ngIf="alreadyUploaded()">Ya hemos recibido un comprobante para esta solicitud. Nuestro equipo lo está validando para activar tu cuenta.</p>
          <p *ngIf="!alreadyUploaded()">Hemos recibido tu comprobante. Nuestro equipo validará el pago en las próximas horas y recibirás un correo con tus credenciales de acceso.</p>
          <button class="btn-back" (click)="goHome()">Volver al Inicio</button>
        </div>
      </div>

      <footer class="legal-footer">
        <p>© 2026 CitaGlam. Todos los derechos reservados.</p>
      </footer>
    </div>
  `,
  styles: [`
    .upload-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #F8FBF9 0%, #E1F3F1 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      font-family: 'Outfit', sans-serif;
    }

    .upload-card {
      width: 100%;
      max-width: 500px;
      padding: 3rem;
      text-align: center;
      background: rgba(255, 255, 255, 0.85);
      border-radius: 32px;
    }

    .brand-logo img { 
      height: 100px; 
      width: auto;
      object-fit: contain;
      margin-bottom: 2.5rem; 
    }
    h1 { color: #1A3E3B; font-size: 1.8rem; margin: 0 0 0.5rem 0; font-weight: 700; }
    p { color: #667; font-size: 1rem; margin-bottom: 2rem; }

    .rejection-alert {
      background: #FFF5F5;
      border: 1px solid #FED7D7;
      border-radius: 16px;
      padding: 1.25rem;
      margin-bottom: 2rem;
      display: flex;
      gap: 1rem;
      text-align: left;
      animation: slideIn 0.4s ease-out;
    }

    .alert-icon {
      color: #E53E3E;
      flex-shrink: 0;
    }

    .alert-content strong {
      display: block;
      color: #C53030;
      font-size: 0.9rem;
      margin-bottom: 4px;
    }

    .alert-content p {
      margin: 0;
      font-size: 0.85rem;
      color: #742A2A;
      line-height: 1.4;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .format-help {
      margin-top: 1.5rem;
      font-size: 0.8rem;
      color: #889;
      font-style: italic;
    }

    .file-uploader {
      border: 2px dashed #CDD7D6;
      border-radius: 24px;
      padding: 3rem 2rem;
      transition: all 0.3s;
      background: #FAFCFB;
      cursor: pointer;
      position: relative;
    }

    .file-uploader:hover, .file-uploader.dragging {
      border-color: #4A8E8A;
      background: #F0F7F6;
    }

    .icon-circle {
      width: 64px;
      height: 64px;
      background: #E1F3F1;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #4A8E8A;
      margin: 0 auto 1.5rem;
    }

    .uploader-content h3 { font-size: 1.1rem; color: #1A3E3B; margin-bottom: 8px; }
    .uploader-content p { font-size: 0.9rem; color: #889; }

    .btn-browse {
      background: white;
      border: 1px solid #CDD7D6;
      padding: 8px 20px;
      border-radius: 12px;
      font-weight: 600;
      color: #4A8E8A;
      margin-top: 1rem;
    }

    .preview-content { position: relative; height: 300px; border-radius: 16px; overflow: hidden; }
    .preview-content img { width: 100%; height: 100%; object-fit: contain; }
    
    .pdf-preview {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #F8FAFC;
      gap: 1rem;
      color: #4A8E8A;
    }
    .pdf-preview i-lucide { width: 60px; height: 60px; }
    .pdf-preview span { font-weight: 600; font-size: 0.9rem; }

    .btn-remove { position: absolute; top: 10px; right: 10px; background: #E57373; color: white; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }

    .actions { display: flex; flex-direction: column; gap: 12px; margin-top: 2rem; }
    .btn-submit { background: #2D4A47; color: white; border: none; padding: 14px; border-radius: 16px; font-weight: 700; width: 100%; cursor: pointer; font-size: 1rem; }
    .btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
    .btn-cancel { background: transparent; color: #889; border: none; font-weight: 600; cursor: pointer; }

    .success-state { padding: 2rem 0; }
    .success-icon { width: 80px; height: 80px; background: #E8F5E9; color: #43A047; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 2rem; }
    .success-icon.already { background: #FFF8E1; color: #F57F17; }
    .success-icon i-lucide { width: 40px; height: 40px; }
    .btn-back { margin-top: 2rem; background: #4A8E8A; color: white; border: none; padding: 12px 30px; border-radius: 12px; font-weight: 600; cursor: pointer; }

    .loading-request { padding: 4rem 0; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
    .spinner { width: 40px; height: 40px; border: 4px solid #E1F3F1; border-top-color: #4A8E8A; border-radius: 50%; animation: spin 0.8s linear infinite; }
    .loading-request p { color: #4A8E8A; font-weight: 600; }

    .legal-footer { margin-top: 2rem; color: #99A; font-size: 0.8rem; }

    .glass-panel { backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.3); }
    .shadow-premium { box-shadow: 0 20px 50px rgba(26, 62, 59, 0.08); }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media screen and (max-width: 768px) {
      .upload-container { padding: 1rem; }
      .upload-card { padding: 2rem 1.5rem; border-radius: 24px; }
      .brand-logo img { height: 70px; margin-bottom: 1.5rem; }
      h1 { font-size: 1.5rem; }
      p { font-size: 0.9rem; margin-bottom: 1.5rem; }
      .file-uploader { padding: 2rem 1rem; }
      .icon-circle { width: 52px; height: 52px; }
      .preview-content { height: 250px; }
      .btn-submit { padding: 16px; font-size: 0.95rem; border-radius: 14px; }
    }
  `]
})
export class UploadRequestPaymentComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  requestId: string | null = null;
  isDragging = false;
  previewUrl = signal<string | null>(null);
  selectedFile: File | null = null;
  isUploading = signal(false);
  isSuccess = signal(false);
  isPdf = signal(false);
  isLoadingRequest = signal(true);
  alreadyUploaded = signal(false);
  rejectionReason = signal<string | null>(null);

  ngOnInit() {
    this.requestId = this.route.snapshot.paramMap.get('id');
    if (!this.requestId) {
      this.notificationService.error('Error', 'Enlace no válido.');
      this.router.navigate(['/login']);
      return;
    }
    this.checkRequestStatus();
  }

  checkRequestStatus() {
    if (!this.requestId) return;

    this.isLoadingRequest.set(true);
    this.authService.getBusinessRequest(this.requestId).subscribe({
      next: (req) => {
        if (req.status === 'WAITING_APPROVAL' || req.status === 'APPROVED') {
          this.alreadyUploaded.set(true);
          this.isSuccess.set(true);
        } else if (req.status === 'PROPOSAL_SENT' && req.adminNotes) {
          this.rejectionReason.set(req.adminNotes);
        }
        this.isLoadingRequest.set(false);
      },
      error: () => {
        // We don't block here, maybe it's just a new request
        this.isLoadingRequest.set(false);
      }
    });
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(e: DragEvent) {
    this.isDragging = false;
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.isDragging = false;
    const file = e.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  onFileSelected(e: any) {
    const file = e.target.files[0];
    if (file) this.processFile(file);
  }

  processFile(file: File) {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 
      'image/gif', 'image/bmp', 'image/heic', 
      'image/heif', 'image/tiff', 'application/pdf'
    ];

    if (!allowedTypes.includes(file.type)) {
      this.notificationService.error('Error', 'Formato no permitido. Use JPG, PNG, WEBP, PDF, HEIC, GIF, BMP o TIFF.');
      return;
    }

    this.selectedFile = file;
    this.isPdf.set(file.type === 'application/pdf');

    const reader = new FileReader();
    reader.onload = () => this.previewUrl.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  removeFile() {
    this.previewUrl.set(null);
    this.isPdf.set(false);
    this.selectedFile = null;
  }

  submit() {
    if (!this.requestId || !this.selectedFile) return;

    this.isUploading.set(true);
    this.authService.uploadPaymentProof(this.requestId, this.selectedFile).subscribe({
      next: () => {
        this.isSuccess.set(true);
        this.isUploading.set(false);
      },
      error: (err) => {
        this.notificationService.error('Error', err.error?.message || 'No se pudo subir el archivo.');
        this.isUploading.set(false);
      }
    });
  }

  goHome() {
    this.router.navigate(['/login']);
  }
}
