import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-setup-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './setup-password.component.html',
  styleUrl: './setup-password.component.css'
})
export class SetupPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);

  setupForm: FormGroup;
  errorMessage = signal<string | null>(null);
  isLoading = signal(false);
  token: string | null = null;

  constructor() {
    this.setupForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParams['token'];
    
    if (!this.token) {
      this.notificationService.error('Enlace Inválido', 'El token de activación no es válido o ha expirado.');
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
    if (this.setupForm.valid && this.token) {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      this.authService.completeExpressActivation({
        token: this.token,
        password: this.setupForm.value.password
      }).subscribe({
        next: () => {
          this.notificationService.success(
            '¡Cuenta Activada!', 
            'Tu contraseña ha sido configurada. Ya puedes iniciar sesión en tu panel.'
          );
          this.router.navigate(['/auth/login']);
        },
        error: (err) => {
          this.isLoading.set(false);
          const msg = err.error?.message || 'Error al completar la activación. El enlace podría haber expirado.';
          this.errorMessage.set(msg);
          this.notificationService.error('Fallo en Activación', msg);
        }
      });
    }
  }
}
