import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Plus, Edit2, Trash2, ChevronDown, ChevronUp, Scissors, Tag } from 'lucide-angular';
import { ServicesService, Service, ServiceCategory } from '../../../core/services/services.service';
import { forkJoin } from 'rxjs';
import { ServiceForm } from '../service-form/service-form.component';
import { CategoryForm } from '../category-form/category-form.component';

@Component({
  selector: 'app-services-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ServiceForm, CategoryForm],
  templateUrl: './services-list.component.html',
  styleUrl: './services-list.component.css'
})
export class ServicesListComponent implements OnInit {
  private servicesService = inject(ServicesService);

  categories = signal<ServiceCategory[]>([]);
  uncategorizedServices = signal<Service[]>([]);
  expandedCategories = signal<Set<string>>(new Set());
  isLoading = signal(true);

  // Modals state
  showServiceModal = signal(false);
  showCategoryModal = signal(false);
  selectedService = signal<Service | null>(null);
  selectedCategory = signal<ServiceCategory | null>(null);
  targetCategoryId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    forkJoin({
      categories: this.servicesService.getCategories(),
      services: this.servicesService.getServices()
    }).subscribe({
      next: ({ categories, services }) => {
        // Group services by category
        const categorized = categories.map(cat => ({
          ...cat,
          services: services.filter(s => s.categoryId === cat.id)
        }));
        
        this.categories.set(categorized);
        this.uncategorizedServices.set(services.filter(s => !s.categoryId));
        
        // Expand all by default
        this.expandedCategories.set(new Set(categorized.map(c => c.id)));
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  toggleCategory(id: string) {
    const current = new Set(this.expandedCategories());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.expandedCategories.set(current);
  }

  isExpanded(id: string): boolean {
    return this.expandedCategories().has(id);
  }

  onAddService(categoryId?: string) {
    this.selectedService.set(null);
    this.targetCategoryId.set(categoryId || null);
    this.showServiceModal.set(true);
  }

  onEditService(service: Service) {
    this.selectedService.set(service);
    this.targetCategoryId.set(service.categoryId || null);
    this.showServiceModal.set(true);
  }

  onDeleteService(id: string) {
    if (confirm('¿Estás seguro de eliminar este servicio?')) {
      this.servicesService.deleteService(id).subscribe({
        next: () => this.loadData(),
        error: (err) => alert(err.error?.message || 'No se pudo eliminar el servicio.')
      });
    }
  }

  onAddCategory() {
    this.selectedCategory.set(null);
    this.showCategoryModal.set(true);
  }

  onEditCategory(category: ServiceCategory) {
    this.selectedCategory.set(category);
    this.showCategoryModal.set(true);
  }

  onDeleteCategory(id: string) {
    if (confirm('¿Eliminar esta categoría? Los servicios se moverán a "Sin Categoría".')) {
      this.servicesService.deleteCategory(id).subscribe({
        next: () => this.loadData(),
        error: (err) => alert(err.error?.message || 'Error al eliminar categoría.')
      });
    }
  }

  onModalClose() {
    this.showServiceModal.set(false);
    this.showCategoryModal.set(false);
  }

  onSave() {
    this.onModalClose();
    this.loadData();
  }
}
