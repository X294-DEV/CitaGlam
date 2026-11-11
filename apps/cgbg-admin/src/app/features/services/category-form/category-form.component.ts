import { Component, EventEmitter, Input, Output, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule, X, Tag, ListOrdered } from 'lucide-angular';
import { ServiceCategory, ServicesService } from '../../../core/services/services.service';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './category-form.component.html',
  styleUrl: './category-form.component.css'
})
export class CategoryForm implements OnInit {
  private fb = inject(FormBuilder);
  private servicesService = inject(ServicesService);

  @Input() category: ServiceCategory | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  form: FormGroup;
  isLoading = false;

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      order: [0, [Validators.required, Validators.min(0)]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    if (this.category) {
      this.form.patchValue(this.category);
    }
  }

  onSubmit() {
    if (this.form.valid) {
      this.isLoading = true;
      const data = this.form.value;
      
      const request = this.category 
        ? this.servicesService.updateCategory(this.category.id, data)
        : this.servicesService.createCategory(data);

      request.subscribe({
        next: () => {
          this.isLoading = false;
          this.saved.emit();
        },
        error: (err) => {
          this.isLoading = false;
          alert(err.error?.message || 'Error al guardar la categoría.');
        }
      });
    }
  }

  onCancel() {
    this.close.emit();
  }
}
