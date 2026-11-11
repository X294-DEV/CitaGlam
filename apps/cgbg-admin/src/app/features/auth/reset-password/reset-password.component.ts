import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);

  resetForm: FormGroup;
  errorMessage = signal<string | null>(null);
  isLoading = signal(false);
  token: string | null = null;

  constructor() {
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParams['token'];
    
    if (!this.token) {
      this.notificationService.error('Vínculo Inválido', 'El token de recuperación no es válido o ha expirado.');
      this.router.navigate(['/auth/login']);
    }
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    return password && confirmPassword && password.value !== confirmPassword.value 
      ? { passwordMismatch: true } 
      : null;
  }

  onSubmit() {
    if (this.resetForm.valid && this.token) {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      this.authService.resetPassword({
        token: this.token,
        newPassword: this.resetForm.value.password
      }).subscribe({
        next: (res) => {
          this.notificationService.success(
            '¡Contraseña Actualizada!', 
            'Tu acceso ha sido restaurado. Iniciando sesión...'
          );
          
          // El backend ya devuelve tokens y el user, AuthService.resetPassword ya los guardó vía tap()
          // Redirigimos según el rol
          const user = res.user;
          const targetRoute = user.role === 'SUPERADMIN' ? '/admin/saas/stats' : '/admin/dashboard';
          this.router.navigate([targetRoute]);
        },
        error: (err) => {
          this.isLoading.set(false);
          const msg = err.error?.message || 'Error al restablecer la contraseña. El enlace podría haber expirado.';
          this.errorMessage.set(msg);
          this.notificationService.error('Error', msg);
        }
      });
    }
  }
}
