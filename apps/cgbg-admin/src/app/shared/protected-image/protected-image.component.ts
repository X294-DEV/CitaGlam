import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ProtectedFileService } from '../../core/services/protected-file.service';

/**
 * Vista previa de un comprobante que solo se entrega con sesión.
 * Pide el archivo con el JWT y lo muestra como imagen; si es PDF o falla, muestra un texto.
 */
@Component({
  selector: 'app-protected-image',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <img *ngIf="src()" [src]="src()!" [alt]="alt()" [class.natural]="fit() === 'natural'" />
    <p class="protected-image-note" *ngIf="!src()">{{ note() }}</p>
  `,
  styles: [`
    :host { display: block; height: 100%; width: 100%; }
    /* 'fill': llena el contenedor recortando; 'natural': respeta la proporción con altura máxima. */
    img { display: block; width: 100%; height: 100%; object-fit: cover; }
    img.natural { height: auto; max-height: 300px; object-fit: contain; background: #F8FBF9; }
    .protected-image-note { margin: 0; padding: 1.5rem 1rem; text-align: center; color: #718096; font-size: 0.85rem; }
  `],
})
export class ProtectedImageComponent {
  /** Ruta del endpoint protegido, por ejemplo `/subscriptions/my-history/<id>/evidence`. */
  path = input.required<string | null>();
  alt = input('Comprobante');
  fit = input<'fill' | 'natural'>('fill');

  src = signal<string | null>(null);
  note = signal('Cargando comprobante…');

  private files = inject(ProtectedFileService);
  private objectUrl: string | null = null;
  private requestSub?: Subscription;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.release());
    effect(() => {
      const path = this.path();
      untracked(() => this.load(path));
    });
  }

  private load(path: string | null): void {
    this.release();
    if (!path) {
      this.note.set('Sin comprobante adjunto.');
      return;
    }
    this.note.set('Cargando comprobante…');
    this.requestSub = this.files.fetchBlob(path).subscribe({
      next: (blob) => {
        if (blob.type === 'image/jpeg' || blob.type === 'image/png') {
          this.objectUrl = URL.createObjectURL(blob);
          this.src.set(this.objectUrl);
        } else if (blob.type === 'application/pdf') {
          this.note.set('Comprobante en PDF. Usa el botón para abrirlo.');
        } else if (blob.type === 'application/octet-stream') {
          this.note.set('Archivo antiguo: usa el botón para descargarlo.');
        } else {
          this.note.set('Este archivo no se puede mostrar aquí.');
        }
      },
      error: (error) => this.note.set(this.files.errorMessage(error)),
    });
  }

  private release(): void {
    this.requestSub?.unsubscribe();
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    this.src.set(null);
  }
}
