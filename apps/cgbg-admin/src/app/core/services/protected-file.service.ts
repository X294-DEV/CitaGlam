import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EnvironmentService } from './environment.service';
import { NotificationService } from './notification.service';

/** Tipos que el visor acepta. Cualquier otro se rechaza para no ejecutar contenido inesperado. */
const VIEWABLE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

/**
 * Pide comprobantes al backend con el JWT (el interceptor lo agrega) y los muestra.
 * Los endpoints ya no son públicos (S0-05), por eso no sirve un enlace directo.
 */
@Injectable({ providedIn: 'root' })
export class ProtectedFileService {
  private http = inject(HttpClient);
  private env = inject(EnvironmentService);
  private notifications = inject(NotificationService);

  /** Comprobante de pago de una cita (negocio dueño). */
  openAppointmentReceipt(appointmentId: string): void {
    this.open(`/receipts/${encodeURIComponent(appointmentId)}/file`);
  }

  /** Comprobante de un pago de suscripción del propio negocio. */
  openMySubscriptionEvidence(paymentId: string): void {
    this.open(`/subscriptions/my-history/${encodeURIComponent(paymentId)}/evidence`);
  }

  /** Comprobante de suscripción desde el panel del superadmin. */
  openProofFile(evidenceUrl: string): void {
    const path = this.proofFilePath(evidenceUrl);
    if (!path) {
      this.notifications.error('Comprobante no disponible', 'Este pago no tiene un archivo adjunto.');
      return;
    }
    this.open(path);
  }

  /** Ruta del endpoint del superadmin. `fileName` es el último segmento de `evidenceUrl`. */
  proofFilePath(evidenceUrl: string | null | undefined): string | null {
    const fileName = (evidenceUrl ?? '').split(/[\\/]/).filter(Boolean).pop();
    // '.' y '..' no se codifican y el navegador los normalizaría a otra ruta.
    if (!fileName || fileName === '.' || fileName === '..') return null;
    return `/admin/global/proof-files/${encodeURIComponent(fileName)}`;
  }

  /** Descarga el archivo como blob. Los errores llegan como HttpErrorResponse. */
  fetchBlob(path: string): Observable<Blob> {
    return this.http.get(this.env.formatUrl(path), { responseType: 'blob' });
  }

  /** Es un tipo que se puede mostrar (imagen o PDF). */
  isViewable(blob: Blob): boolean {
    return VIEWABLE_TYPES.includes(blob.type);
  }

  /** Mensaje visible para el usuario según el error HTTP. */
  errorMessage(error: unknown): string {
    const status = error instanceof HttpErrorResponse ? error.status : -1;
    switch (status) {
      case 0:
        return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
      case 400:
        return 'La solicitud del comprobante no es válida.';
      case 401:
        return 'Tu sesión ya no es válida. Inicia sesión de nuevo.';
      case 403:
        return 'No tienes permiso para ver este comprobante.';
      case 404:
        return 'El comprobante no existe o ya no está disponible.';
      default:
        return 'No se pudo abrir el comprobante. Inténtalo de nuevo más tarde.';
    }
  }

  /** Abre el archivo en una pestaña nueva. */
  private open(path: string): void {
    // La pestaña se abre dentro del clic; si se abriera después de la petición, el navegador la bloquearía.
    const viewer = window.open('', '_blank');
    if (!viewer) {
      this.notifications.error(
        'Ventana bloqueada',
        'El navegador bloqueó la ventana del comprobante. Permite ventanas emergentes para este sitio e inténtalo de nuevo.'
      );
      return;
    }
    viewer.opener = null;
    viewer.document.title = 'Comprobante';
    viewer.document.body.textContent = 'Cargando comprobante…';

    this.fetchBlob(path).subscribe({
      next: (blob) => {
        // Archivos antiguos: el backend los entrega como descarga genérica. Se descargan, no se muestran,
        // para no abrir contenido no verificado en el origen del panel.
        if (blob.type === 'application/octet-stream') {
          this.download(blob);
          viewer.close();
          this.notifications.success('Descarga iniciada', 'Este comprobante es un archivo antiguo y se descargó en lugar de mostrarse.');
          return;
        }
        if (!this.isViewable(blob)) {
          viewer.close();
          this.notifications.error(
            'Archivo no compatible',
            'Este comprobante no es una imagen ni un PDF, por lo que no se puede mostrar.'
          );
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        viewer.location.href = objectUrl;
        setTimeout(() => URL.revokeObjectURL(objectUrl), 5 * 60 * 1000);
      },
      error: (error) => {
        viewer.close();
        // Con 401 el interceptor ya avisó que la sesión expiró y redirige al login.
        if (!(error instanceof HttpErrorResponse && error.status === 401)) {
          this.notifications.error('No se pudo abrir el comprobante', this.errorMessage(error));
        }
      },
    });
  }

  private download(blob: Blob): void {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = 'comprobante';
    link.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  }
}
