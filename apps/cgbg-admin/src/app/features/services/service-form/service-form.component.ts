import { Component, EventEmitter, Input, Output, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule, X, Check, Info } from 'lucide-angular';
import { Service, ServiceCategory, ServicesService } from '../../../core/services/services.service';

@Component({
  selector: 'app-service-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './service-form.component.html',
  styleUrl: './service-form.component.css'
})
export class ServiceForm implements OnInit {
  private fb = inject(FormBuilder);
  private servicesService = inject(ServicesService);

  @Input() service: Service | null = null;
  @Input() categoryId: string | null = null;
  @Input() categories: ServiceCategory[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  form: FormGroup;
  isLoading = false;
  errorMessage = signal<string | null>(null);

  readonly colorPresets = [
    '#4A8E8A', '#669BBC', '#1A535C', '#9BC1BC', 
    '#EDDCD2', '#DBE7E4', '#A5A58D', '#6B705C'
  ];

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      price: [0, [Validators.required, Validators.min(0)]],
      durationMin: [30, [Validators.required, Validators.min(5)]],
      categoryId: [null],
      color: ['#4A8E8A'],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    if (this.service) {
      this.form.patchValue({
        name: this.service.name,
        description: this.service.description || '',
        price: this.service.price,
        durationMin: this.service.durationMin,
        categoryId: this.service.categoryId || null,
        color: this.service.color || '#4A8E8A',
        isActive: this.service.isActive,
      });
    } else if (this.categoryId) {
      this.form.patchValue({ categoryId: this.categoryId });
    }
  }

  onSubmit() {
    if (this.form.valid) {
      this.isLoading = true;
      const raw = this.form.value;
      const data = {
        name: raw.name,
        description: raw.description || undefined,
        price: Number(raw.price),
        durationMin: Number(raw.durationMin),
        categoryId: raw.categoryId || null,
        color: raw.color,
        isActive: raw.isActive,
      };
      
      const request = this.service 
        ? this.servicesService.updateService(this.service.id, data)
        : this.servicesService.createService(data);

      request.subscribe({
        next: () => {
          this.isLoading = false;
          this.saved.emit();
        },
        error: (err) => {
          this.isLoading = false;
          if (err.status === 403) {
            this.errorMessage.set(err.error?.message || 'Has alcanzado el límite de tu plan actual. Por favor, actualiza tu suscripción.');
          } else {
            this.errorMessage.set('Ocurrió un error al guardar el servicio. Por favor, intenta de nuevo.');
          }
        }
      });
    }
  }

  onCancel() {
    this.close.emit();
  }

  selectColor(color: string) {
    this.form.patchValue({ color });
  }
}
