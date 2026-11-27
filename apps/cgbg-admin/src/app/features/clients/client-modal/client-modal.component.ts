import { Component, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, ReactiveFormsModule, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { LucideAngularModule, X, User, Mail, Phone, Calendar, AlignLeft, Check } from 'lucide-angular';
import { ClientService } from '../../../core/services/client.service';

/** Mismo criterio que el backend (S1-01): teléfono internacional con +, sin espacios. */
const PHONE_PATTERN = /^\+[1-9]\d{1,14}$/;

function internationalPhone(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').replace(/\s+/g, '');
  return PHONE_PATTERN.test(value) ? null : { phone: true };
}

@Component({
  selector: 'app-client-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './client-modal.component.html',
  styleUrl: './client-modal.component.css'
})
export class ClientModalComponent {
  private fb = inject(FormBuilder);
  private clientService = inject(ClientService);

  @Output() saved = new EventEmitter<void>();

  isOpen = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');

  clientForm: FormGroup;

  constructor() {
    this.clientForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, internationalPhone]],
    });
  }

  open() {
    this.errorMessage.set('');
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
    this.clientForm.reset();
  }

  save() {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    const value = this.clientForm.value;
    // Solo los campos del contrato (CreateCustomerRequest): el backend rechaza campos extra.
    this.clientService.create({
      firstName: String(value.firstName).trim(),
      lastName: String(value.lastName).trim(),
      email: String(value.email).trim(),
      phone: String(value.phone).replace(/\s+/g, ''),
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.saved.emit();
        this.close();
      },
      error: (error) => {
        const message = error?.error?.message;
        this.errorMessage.set(
          (Array.isArray(message) ? message.join(' ') : message) || 'No se pudo registrar al cliente.'
        );
        this.isLoading.set(false);
      }
    });
  }
}
