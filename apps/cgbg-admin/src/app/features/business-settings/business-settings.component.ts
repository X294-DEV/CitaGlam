import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { LucideAngularModule, Building2, MapPin, Phone, Clock, Calendar, Plus, Trash2, Check, X, AlertCircle } from 'lucide-angular';
import { BranchService, Branch, BusinessSchedule, WorkException } from '../../core/services/branch.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-business-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './business-settings.component.html',
  styleUrl: './business-settings.component.css'
})
export class BusinessSettingsComponent implements OnInit {
  private branchService = inject(BranchService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  branch = signal<Branch | null>(null);
  isLoading = signal(true);
  activeTab = signal<'info' | 'schedule' | 'exceptions'>('info');

  branchForm: FormGroup;
  scheduleForm: FormGroup;

  days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  constructor() {
    this.branchForm = this.fb.group({
      name: ['', Validators.required],
      address: ['', Validators.required],
      city: [''],
      phone: [''],
    });

    this.scheduleForm = this.fb.group({
      schedules: this.fb.array([])
    });
  }

  get schedulesArray() {
    return this.scheduleForm.get('schedules') as FormArray;
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.branchService.getMyBranch().subscribe({
      next: (branch) => {
        this.branch.set(branch);
        this.branchForm.patchValue(branch);
        this.loadSchedules(branch.id);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadSchedules(branchId: string) {
    this.branchService.getSchedules(branchId).subscribe({
      next: (schedules) => {
        this.initScheduleForm(schedules);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  initScheduleForm(schedules: BusinessSchedule[]) {
    this.schedulesArray.clear();
    // Ensure all 7 days are present
    for (let i = 0; i < 7; i++) {
      const existing = schedules.find(s => s.dayOfWeek === i);
      this.schedulesArray.push(this.fb.group({
        dayOfWeek: [i],
        isOpen: [existing ? existing.isOpen : true],
        openTime: [existing ? existing.openTime : '09:00'],
        closeTime: [existing ? existing.closeTime : '18:00'],
        openTime2: [existing?.openTime2 || null],
        closeTime2: [existing?.closeTime2 || null],
        showSecondRange: [!!existing?.openTime2]
      }));
    }
  }

  toggleSecondRange(index: number) {
    const group = this.schedulesArray.at(index);
    const currentState = group.get('showSecondRange')?.value;
    group.patchValue({ 
      showSecondRange: !currentState,
      openTime2: !currentState ? '16:00' : null,
      closeTime2: !currentState ? '20:00' : null
    });
  }

  saveBranchInfo() {
    if (this.branchForm.valid && this.branch()) {
      this.branchService.updateBranch(this.branch()!.id, this.branchForm.value).subscribe({
        next: () => alert('Información actualizada'),
        error: () => alert('Error al actualizar')
      });
    }
  }

  saveSchedules() {
    if (this.branch()) {
      const rawSchedules = this.scheduleForm.value.schedules.map((s: any) => {
        const { showSecondRange, ...rest } = s;
        return rest;
      });
      this.branchService.updateSchedules(this.branch()!.id, rawSchedules).subscribe({
        next: () => alert('Horarios actualizados'),
        error: () => alert('Error al actualizar horarios')
      });
    }
  }

  setTab(tab: 'info' | 'schedule' | 'exceptions') {
    this.activeTab.set(tab);
  }
}
