import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import Swal from 'sweetalert2';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  loginForm: FormGroup;
  errorMessage: string | null = null;
  isLoading = false;
  turnstileSiteKey: string | null = null;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      remember: [false]
    });
  }

  ngOnInit(): void {
    console.log('[LoginComponent] OnInit - Checking authentication status.');
    const user = this.authService.currentUser();
    if (this.authService.isAuthenticated() && user) {
      console.log('[LoginComponent] User already authenticated. Role:', user.role);
      const targetRoute = user.role === 'SUPERADMIN' ? '/admin/saas/stats' : '/admin/dashboard';
      this.router.navigate([targetRoute]);
      return;
    }

    const savedEmail = this.authService.getSavedEmail();
    if (savedEmail) {
      this.loginForm.patchValue({ email: savedEmail, remember: true });
    }

    // Cargar configuración pública para Captcha
    this.authService.getPublicConfig().subscribe({
      next: (config) => {
        if (config.turnstileSiteKey) {
          this.turnstileSiteKey = config.turnstileSiteKey;
          console.log('[LoginComponent] Turnstile SiteKey loaded dynamically.');
        }
      },
      error: (err) => console.error('[LoginComponent] Error loading public config:', err)
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = null;

      const { email, password, remember } = this.loginForm.value;

      this.authService.login({ email, password }, remember).subscribe({
        next: (res) => {
          console.log('[LoginComponent] Login success. Role:', res.user.role);
          
          if (res.user.isActive === false && res.user.role === 'ADMIN') {
            this.router.navigate(['/auth/verify-email']);
            return;
          }

          const targetRoute = res.user.role === 'SUPERADMIN' ? '/admin/saas/stats' : '/admin/dashboard';
          this.router.navigate([targetRoute]).then(success => {
            console.log('[LoginComponent] Navigation result:', success);
          });
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.message || 'Credenciales inválidas o error de conexión.';
        }
      });
    }
  }

  async onForgotPassword() {
    const { value: email } = await Swal.fire({
      title: 'Recuperar Contraseña',
      text: 'Ingresa tu correo electrónico para enviarte las instrucciones de recuperación:',
      input: 'email',
      inputPlaceholder: 'tu@correo.com',
      showCancelButton: true,
      confirmButtonText: 'Enviar Instrucciones',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2D4A47',
      cancelButtonColor: '#CDD7D6',
      inputValidator: (value) => {
        if (!value) {
          return '¡Se requiere un correo electrónico válido!';
        }
        return null;
      }
    });

    if (email) {
      this.notificationService.success('Procesando...', 'Estamos validando tu solicitud.');
      
      this.authService.forgotPassword(email).subscribe({
        next: (res) => {
          Swal.fire({
            title: '¡Correo Enviado!',
            text: res.message || 'Si el correo está registrado, recibirás un enlace de recuperación pronto.',
            icon: 'success',
            confirmButtonColor: '#4A8E8A'
          });
        },
        error: (err) => {
          this.notificationService.error('Error', err.error?.message || 'No se pudo procesar la solicitud.');
        }
      });
    }
  }

  async registerRedirect() {
    let turnstileToken = '';

    const { value: formValues } = await Swal.fire({
      title: 'Registra tu Negocio',
      html: `
        <style>
          .swal-zen-input {
            width: 100% !important;
            padding: 12px 16px !important;
            border-radius: 12px !important;
            border: 1px solid #EAEAEA !important;
            background-color: #FAFAFA !important;
            font-size: 0.95rem !important;
            transition: all 0.3s ease !important;
            box-sizing: border-box !important;
            margin: 5px 0 15px 0 !important;
            height: auto !important;
            display: block !important;
          }
          .swal-zen-input:focus {
            outline: none !important;
            border-color: #4A8E8A !important;
            background-color: white !important;
            box-shadow: 0 0 0 4px rgba(74, 142, 138, 0.1) !important;
          }
          .swal-zen-label {
            font-size: 0.75rem;
            font-weight: 700;
            color: #4A8E8A;
            display: block;
            margin-left: 2px;
            text-align: left;
          }
        </style>
        <div class="swal-custom-container" style="text-align: left; padding: 0 5px;">
          <p style="margin-bottom: 20px; color: #667; font-size: 0.9rem; text-align: center;">
            Déjanos tus datos y un asesor te contactará para activar tu plataforma <strong>CitaGlam</strong>.
          </p>
          
          <label class="swal-zen-label">NOMBRE COMPLETO</label>
          <input id="swal-fullname" class="swal-zen-input" placeholder="Ej: Juan Pérez">

          <label class="swal-zen-label">CORREO ELECTRÓNICO</label>
          <input id="swal-email" type="email" class="swal-zen-input" placeholder="tu@correo.com">

          <label class="swal-zen-label">NOMBRE DEL NEGOCIO</label>
          <input id="swal-business" class="swal-zen-input" placeholder="Ej: Studio Luxury">

          <label class="swal-zen-label">TELÉFONO / WHATSAPP</label>
          <input id="swal-phone" type="tel" class="swal-zen-input" placeholder="10 dígitos">
          
          <div id="turnstile-container" style="margin-bottom: 20px; display: flex; justify-content: center; min-height: 65px;"></div>
          
          <div style="display: flex; align-items: start; gap: 10px; font-size: 0.8rem; color: #555; margin-bottom: 15px; padding: 0 5px;">
            <input type="checkbox" id="swal-terms" style="margin-top: 3px; accent-color: #4A8E8A;">
            <label for="swal-terms" style="cursor: pointer;">
              He leído y acepto los <a href="#" style="color: #4A8E8A; text-decoration: underline;">Términos de Servicio</a> y autorizo el uso de mis datos para contacto comercial.
            </label>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Enviar Solicitud',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2D4A47',
      cancelButtonColor: '#CDD7D6',
      didOpen: () => {
        try {
          // @ts-ignore
          if (window.turnstile && this.turnstileSiteKey) {
            // @ts-ignore
            window.turnstile.render('#turnstile-container', {
              sitekey: this.turnstileSiteKey,
              callback: (token: string) => {
                turnstileToken = token;
              },
            });
          } else if (!this.turnstileSiteKey) {
             console.warn('[LoginComponent] Turnstile SiteKey not loaded yet or disabled.');
             // Optional: Render with testing key or hide if mandatory
          }
        } catch (e) {
          console.error('Turnstile fail to load', e);
        }
      },
      preConfirm: () => {
        const fullName = (document.getElementById('swal-fullname') as HTMLInputElement).value.trim();
        const email = (document.getElementById('swal-email') as HTMLInputElement).value.trim();
        const businessName = (document.getElementById('swal-business') as HTMLInputElement).value.trim();
        const phone = (document.getElementById('swal-phone') as HTMLInputElement).value.trim();
        const terms = (document.getElementById('swal-terms') as HTMLInputElement).checked;

        // Validaciones Manuales
        if (!fullName) {
          Swal.showValidationMessage('El nombre completo es obligatorio.');
          return false;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
          Swal.showValidationMessage('Ingresa un correo electrónico válido.');
          return false;
        }

        if (!businessName) {
          Swal.showValidationMessage('El nombre del negocio es obligatorio.');
          return false;
        }

        if (!phone || phone.length < 10) {
          Swal.showValidationMessage('Ingresa un teléfono válido de al menos 10 dígitos.');
          return false;
        }

        if (!turnstileToken) {
          Swal.showValidationMessage('Por favor completa la verificación anti-bot.');
          return false;
        }

        if (!terms) {
          Swal.showValidationMessage('Debes aceptar los términos y condiciones.');
          return false;
        }

        return { fullName, email, businessName, phone, turnstileToken };
      }
    });

    if (formValues) {
      this.notificationService.success('Procesando...', 'Enviando tu solicitud al equipo de CitaGlam.');
      
      this.authService.registerBusinessRequest(formValues).subscribe({
        next: () => {
          Swal.fire({
            title: '¡Solicitud Recibida!',
            text: 'Gracias por tu interés. Un asesor de ventas se pondrá en contacto contigo muy pronto para los detalles del pago y activación.',
            icon: 'success',
            confirmButtonColor: '#4A8E8A'
          });
        },
        error: (err) => {
          this.notificationService.error('Error', err.error?.message || 'No se pudo enviar la solicitud en este momento.');
        }
      });
    }
  }
}
