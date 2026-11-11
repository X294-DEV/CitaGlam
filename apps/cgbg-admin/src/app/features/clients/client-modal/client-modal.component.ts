import { Component, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule, X, User, Mail, Phone, Calendar, AlignLeft, Check } from 'lucide-angular';
import { ClientService } from '../../../core/services/client.service';

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

  clientForm: FormGroup;

  constructor() {
    this.clientForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      birthday: [''],
      notes: [''],
    });
  }

  open() {
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
    this.clientForm.reset();
  }

  save() {
    if (this.clientForm.invalid) return;

    this.isLoading.set(true);
    this.clientService.create(this.clientForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.saved.emit();
        this.close();
      },
      error: () => this.isLoading.set(false)
    });
  }
}
