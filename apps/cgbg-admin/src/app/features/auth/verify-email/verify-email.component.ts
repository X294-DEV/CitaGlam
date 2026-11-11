import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LucideAngularModule, Mail, RefreshCw, ChevronLeft, AlertCircle, CheckCircle } from 'lucide-angular';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <div class="verify-container">
      <div class="glass-card">
        <div class="icon-header">
          <lucide-icon [name]="success() ? 'CheckCircle' : 'Mail'" class="main-icon" [class.success]="success()"></lucide-icon>
        </div>

        <h1 class="title">{{ success() ? '¡Correo Enviado!' : 'Verifica tu cuenta' }}</h1>
        <p class="description">
          {{ success() ? 'Hemos reenviado el enlace a tu bandeja de entrada.' : 'Para acceder a tu panel, primero debes confirmar tu dirección de correo electrónico.' }}
        </p>

        <div class="email-badge">
          {{ userEmail }}
        </div>

        <div class="info-box">
          <lucide-icon name="AlertCircle" size="18"></lucide-icon>
          <span>¿No lo encuentras? Revisa tu carpeta de correos no deseados o SPAM.</span>
        </div>

        <div class="actions">
          <button 
            class="btn-resend" 
            [disabled]="countdown() > 0 || loading()" 
            (click)="onResend()">
            <lucide-icon name="RefreshCw" [class.spin]="loading()" size="18"></lucide-icon>
            <span>{{ countdown() > 0 ? 'Reenviar en ' + countdown() + 's' : 'Reenviar correo de verificación' }}</span>
          </button>

          <a routerLink="/auth/login" class="btn-back">
            <lucide-icon name="ChevronLeft" size="18"></lucide-icon>
            Volver al inicio de sesión
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      background: linear-gradient(135deg, #f5fcf9 0%, #e8f3f0 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Outfit', sans-serif;
    }

    .verify-container { width: 100%; max-width: 480px; padding: 1.25rem; }

    .glass-card {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.5);
      border-radius: 32px;
      padding: 3rem 2.5rem;
      text-align: center;
      box-shadow: 0 20px 40px rgba(26, 62, 59, 0.05);
    }

    .icon-header {
      width: 80px; height: 80px;
      background: #f0f7f6;
      border-radius: 24px;
      display: flex;
      align-items: center; justify-content: center;
      margin: 0 auto 24px;
      color: #4A8E8A;
    }

    .main-icon { width: 32px; height: 32px; }
    .main-icon.success { color: #4CAF50; }

    .title { color: #1A3E3B; font-size: 24px; font-weight: 800; margin-bottom: 12px; }
    .description { color: #64748B; font-size: 16px; line-height: 1.6; margin-bottom: 24px; }

    .email-badge {
      display: inline-block;
      background: #1A3E3B;
      color: white;
      padding: 8px 20px;
      border-radius: 100px;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 30px;
    }

    .info-box {
      background: #F8FAFC;
      border-radius: 16px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #64748B;
      font-size: 13px;
      text-align: left;
      margin-bottom: 32px;
    }

    .actions { display: flex; flex-direction: column; gap: 16px; }

    .btn-resend {
      background: #4A8E8A;
      color: white;
      border: none;
      padding: 16px;
      border-radius: 16px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: all 0.3s ease;
    }

    .btn-resend:hover:not(:disabled) { background: #3d7571; transform: translateY(-2px); }
    .btn-resend:disabled { background: #cbd5e1; cursor: not-allowed; opacity: 0.8; }

    .btn-back {
      color: #64748B;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .btn-back:hover { color: #1A3E3B; }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    @media screen and (max-width: 480px) {
      .glass-card { padding: 2rem 1.5rem; border-radius: 24px; }
      .icon-header { width: 64px; height: 64px; margin-bottom: 20px; }
      .title { font-size: 1.25rem; }
      .description { font-size: 0.95rem; }
      .email-badge { padding: 6px 16px; font-size: 13px; margin-bottom: 20px; }
      .btn-resend { padding: 14px; font-size: 0.9rem; border-radius: 14px; }
    }
  `]
})
export class VerifyEmailComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  userEmail = '';
  countdown = signal(0);
  loading = signal(false);
  success = signal(false);
  timer: any;

  ngOnInit() {
    const user = this.authService.currentUser();
    if (!user) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.userEmail = user.email;

    // Redirect unless the API explicitly says the account is still inactive.
    if (user.isActive !== false) {
      this.router.navigate(['/admin/dashboard']);
    }
  }

  onResend() {
    if (this.countdown() > 0) return;

    this.loading.set(true);
    this.authService.resendActivation(this.userEmail).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
        this.notificationService.success('Enviado', 'Se ha enviado un nuevo enlace de activación.');
        this.startCountdown();
      },
      error: () => {
        this.loading.set(false);
        this.notificationService.error('Error', 'No se pudo reenviar el correo. Inténtalo más tarde.');
      }
    });
  }

  startCountdown() {
    this.countdown.set(60);
    this.timer = setInterval(() => {
      this.countdown.update(v => v - 1);
      if (this.countdown() <= 0) {
        clearInterval(this.timer);
        this.success.set(false);
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
