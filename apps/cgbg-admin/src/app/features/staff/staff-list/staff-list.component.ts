import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule, X, Check, Info } from 'lucide-angular';
import { StaffService, StaffMember, CreateStaffDto } from '../../../core/services/staff.service';

@Component({
  selector: 'app-staff-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ReactiveFormsModule],
  template: `
    <div class="staff-list">
      <header class="page-header">
        <div class="header-content">
          <h1>Equipo y Personal</h1>
          <p>Gestiona los accesos de tu equipo administrativo</p>
        </div>
        <button class="btn-primary" (click)="openInviteModal()">
          <i-lucide name="plus"></i-lucide>
          Invitar Staff
        </button>
      </header>

      <div class="staff-grid">
        <div class="staff-card glass-panel" *ngFor="let member of staff()">
          <div class="card-header">
            <div class="avatar-circle">
              {{ member.firstName[0] }}{{ member.lastName[0] }}
            </div>
            <div class="name-info">
              <h3>{{ member.firstName }} {{ member.lastName }}</h3>
              <p class="email">{{ member.email }}</p>
            </div>
            <span class="role-badge" [class]="member.role.toLowerCase()">
              {{ member.role }}
            </span>
          </div>
          
          <div class="card-footer">
            <div class="date">Miembro desde {{ member.createdAt | date:'shortDate' }}</div>
            <button class="btn-icon text-red" (click)="deleteMember(member)">
              <i-lucide name="trash-2"></i-lucide>
            </button>
          </div>
        </div>
      </div>

      <div class="empty-state glass-panel" *ngIf="staff().length === 0">
        <div class="icon-box">
          <i-lucide name="users"></i-lucide>
        </div>
        <h3>No hay staff registrado</h3>
        <p>Invita a tus colaboradores para que te ayuden a gestionar el negocio.</p>
        <button class="btn-secondary" (click)="openInviteModal()">Invitar al primero</button>
      </div>

      <!-- Invite Modal -->
      <div class="modal-backdrop" *ngIf="showModal()" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <div class="header-text">
              <h2 class="title">Invitar Colaborador</h2>
              <p class="subtitle">Envía una invitación por correo electrónico.</p>
            </div>
            <button class="btn-icon-close" (click)="closeModal()">
              <i-lucide name="x"></i-lucide>
            </button>
          </header>

          <form [formGroup]="inviteForm" (ngSubmit)="onInvite()" class="modal-body">
            <div class="alert alert-error" *ngIf="errorMessage()">
              <i-lucide name="info" class="icon-sm"></i-lucide>
              <span>{{ errorMessage() }}</span>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>Nombre</label>
                <input type="text" formControlName="firstName" placeholder="Nombre">
              </div>
              <div class="form-group flex-1">
                <label>Apellido</label>
                <input type="text" formControlName="lastName" placeholder="Apellido">
              </div>
            </div>

            <div class="form-group">
              <label>Correo Electrónico</label>
              <input type="email" formControlName="email" placeholder="correo@ejemplo.com">
            </div>

            <div class="form-group">
              <label>Rol</label>
              <select formControlName="role">
                <option value="STAFF">Staff (Solo gestión)</option>
                <option value="ADMIN">Admin (Gestión completa)</option>
              </select>
            </div>

            <div class="form-footer">
              <button type="button" class="btn-text" (click)="closeModal()" [disabled]="isLoading()">Cancelar</button>
              <button type="submit" class="btn-primary" [disabled]="inviteForm.invalid || isLoading()">
                <span *ngIf="!isLoading()">Enviar Invitación</span>
                <span *ngIf="isLoading()">Enviando...</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .staff-list { padding: 2rem; max-width: 1200px; margin: 0 auto; position: relative; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; }
    .page-header h1 { font-family: 'Outfit', sans-serif; font-size: 2.2rem; color: #2D4A47; margin: 0; }
    .page-header p { color: #888; margin: 4px 0 0 0; }

    .btn-primary { background: #4A8E8A; color: white; border: none; padding: 12px 24px; border-radius: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.3s ease; }
    .btn-primary:hover { background: #3d7571; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(74, 142, 138, 0.2); }
    .btn-primary:disabled { background: #AECAC8; cursor: not-allowed; }

    .staff-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.5rem; }
    .staff-card { background: white; padding: 24px; border: 1px solid #F0F5F2; display: flex; flex-direction: column; gap: 20px; transition: all 0.3s ease; }
    .staff-card:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(0,0,0,0.03); }

    .card-header { display: flex; align-items: center; gap: 16px; position: relative; }
    .avatar-circle { width: 50px; height: 50px; background: #F0F7F6; color: #4A8E8A; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-family: 'Outfit', sans-serif; font-size: 1.1rem; }
    
    .name-info { flex: 1; min-width: 0; }
    .name-info h3 { font-family: 'Outfit', sans-serif; font-size: 1.1rem; color: #333; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .email { font-size: 0.85rem; color: #888; margin: 2px 0 0 0; }

    .role-badge { padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
    .role-badge.admin { background: #FFF4E5; color: #FF9800; }
    .role-badge.staff { background: #E0F2F1; color: #4DB6AC; }
    .role-badge.superadmin { background: #E8EAF6; color: #3F51B5; }

    .card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid #F8F8F8; }
    .date { font-size: 0.8rem; color: #AAA; }
    
    .btn-icon, .btn-icon-close { background: #F8F9FA; border: none; color: #CCC; cursor: pointer; padding: 8px; border-radius: 10px; transition: all 0.2s ease; }
    .btn-icon:hover, .btn-icon-close:hover { background: #E0E7E6; color: #4A8E8A; }
    .btn-icon.text-red:hover { color: #E57373; background: #FFF1F1; }

    .empty-state { padding: 60px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; margin-top: 20px; }
    .icon-box { width: 80px; height: 80px; background: #F0F7F6; color: #4A8E8A; border-radius: 24px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
    .icon-box i-lucide { width: 40px; height: 40px; }
    .empty-state h3 { font-family: 'Outfit', sans-serif; color: #2D4A47; font-size: 1.5rem; margin: 0; }
    .empty-state p { color: #888; max-width: 300px; line-height: 1.6; }
    .btn-secondary { background: none; border: 2px solid #E0E7E6; color: #4A8E8A; padding: 12px 24px; border-radius: 14px; font-weight: 700; cursor: pointer; margin-top: 8px; }

    /* Modal Styles */
    .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
    .modal-content { background: white; width: 100%; max-width: 500px; border-radius: 28px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
    .modal-header { padding: 32px; border-bottom: 1px solid #F5F5F5; display: flex; justify-content: space-between; align-items: center; }
    .modal-header .title { font-family: 'Outfit', sans-serif; font-size: 1.6rem; color: #2D4A47; margin: 0; }
    .modal-header .subtitle { color: #888; margin: 4px 0 0 0; font-size: 0.9rem; }
    .modal-body { padding: 32px; display: flex; flex-direction: column; gap: 20px; }
    
    .alert-error { background: #FFF1F1; border: 1px solid #FFEBEB; color: #D32F2F; padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; gap: 10px; font-size: 0.9rem; }
    
    .form-row { display: flex; gap: 16px; }
    .flex-1 { flex: 1; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 0.85rem; font-weight: 600; color: #555; }
    .form-group input, .form-group select { padding: 12px 16px; border-radius: 12px; border: 1px solid #EAEAEA; background: #FAFAFA; transition: all 0.3s; }
    .form-group input:focus, .form-group select:focus { border-color: #4A8E8A; background: white; outline: none; }
    
    .modal-footer { margin-top: 12px; display: flex; justify-content: flex-end; gap: 16px; align-items: center; }
    .btn-text { background: none; border: none; font-weight: 600; color: #888; cursor: pointer; }

    .glass-panel { border-radius: 28px; box-shadow: 0 4px 20px rgba(0,0,0,0.01); }
  `]
})
export class StaffListComponent implements OnInit {
  private staffService = inject(StaffService);
  private fb = inject(FormBuilder);

  staff = signal<StaffMember[]>([]);
  showModal = signal(false);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  inviteForm: FormGroup;

  constructor() {
    this.inviteForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      role: ['STAFF', [Validators.required]]
    });
  }

  ngOnInit() {
    this.loadStaff();
  }

  loadStaff() {
    this.staffService.getStaff().subscribe({
      next: (data) => this.staff.set(data),
      error: (err) => console.error('Error loading staff', err)
    });
  }

  openInviteModal() {
    this.errorMessage.set(null);
    this.inviteForm.reset({ role: 'STAFF' });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  onInvite() {
    if (this.inviteForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.staffService.createStaff(this.inviteForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.closeModal();
        this.loadStaff();
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 403) {
          this.errorMessage.set(err.error?.message || 'Has alcanzado el límite de personal de tu plan.');
        } else {
          this.errorMessage.set('Error al enviar la invitación. Intenta de nuevo.');
        }
      }
    });
  }

  deleteMember(member: StaffMember) {
    if (confirm(`¿Estás seguro de que quieres eliminar a ${member.firstName}?`)) {
      this.staffService.deleteStaff(member.id).subscribe(() => this.loadStaff());
    }
  }
}
