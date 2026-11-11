import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly primaryColor = '#2D4A47';
  private readonly secondaryColor = '#4A8E8A';
  private readonly accentColor = '#E8F0ED';

  private baseOptions = {
    color: '#1A3E3B',
    confirmButtonColor: this.primaryColor,
    cancelButtonColor: '#CDD7D6',
    reverseButtons: true,
    buttonsStyling: true,
    customClass: {
      popup: 'premium-swal-popup',
      title: 'premium-swal-title',
      confirmButton: 'premium-swal-confirm',
      cancelButton: 'premium-swal-cancel'
    }
  };

  success(title: string, text: string = '') {
    return Swal.fire({
      ...this.baseOptions,
      icon: 'success',
      iconColor: this.secondaryColor,
      title,
      text,
      timer: 3000,
      showConfirmButton: false
    });
  }

  error(title: string, text: string = '') {
    return Swal.fire({
      ...this.baseOptions,
      icon: 'error',
      iconColor: '#DC2626',
      title,
      text
    });
  }

  async confirm(title: string, text: string, confirmButtonText: string = 'Confirmar') {
    return Swal.fire({
      ...this.baseOptions,
      icon: 'question',
      iconColor: this.secondaryColor,
      title,
      text,
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText: 'Cancelar'
    });
  }

  async sessionExpiry(seconds: number) {
    let timerInterval: any;
    return Swal.fire({
      title: '¿Sigues ahí?',
      html: `Tu sesión está por expirar en <b>${seconds}</b> segundos.<br/>¿Deseas extenderla?`,
      icon: 'warning',
      iconColor: '#F59E0B',
      showCancelButton: true,
      confirmButtonText: 'Sí, extender sesión',
      cancelButtonText: 'No, salir',
      confirmButtonColor: this.primaryColor,
      cancelButtonColor: '#CDD7D6',
      timer: seconds * 1000,
      timerProgressBar: true,
      allowOutsideClick: false,
      didOpen: () => {
        const b = Swal.getHtmlContainer()?.querySelector('b');
        if (b) {
          timerInterval = setInterval(() => {
            const timer = Swal.getTimerLeft();
            if (timer) {
              b.textContent = Math.ceil(timer / 1000).toString();
            }
          }, 1000);
        }
      },
      willClose: () => {
        clearInterval(timerInterval);
      }
    });
  }
}
