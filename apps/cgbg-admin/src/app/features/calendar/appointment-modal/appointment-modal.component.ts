import { Component, inject, signal, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule, X, User, Scissors, Calendar as IconCalendar, Clock, AlignLeft, Info, Check, Trash2 } from 'lucide-angular';
import { AppointmentService, Appointment } from '../../../core/services/appointment.service';
import { BranchService, Branch } from '../../../core/services/branch.service';
import { ServicesService, Service } from '../../../core/services/services.service';

@Component({
  selector: 'app-appointment-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './appointment-modal.component.html',
  styleUrl: './appointment-modal.component.css'
})
export class AppointmentModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private appointmentService = inject(AppointmentService);
  private branchService = inject(BranchService);
  private servicesService = inject(ServicesService);

  @Output() appointmentSaved = new EventEmitter<void>();

  isOpen = signal(false);
  isEdit = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');
  appointment = signal<Appointment | null>(null);

  appointmentForm: FormGroup;
  branches = signal<Branch[]>([]);
  services = signal<Service[]>([]);
  availableSlots = signal<string[]>([]);

  constructor() {
    this.appointmentForm = this.fb.group({
      branchId: ['', Validators.required],
      serviceId: ['', Validators.required],
      date: ['', Validators.required],
      startTime: ['', Validators.required],
      notes: [''],
      clientEmail: ['', [Validators.required, Validators.email]],
      clientFirstName: ['', Validators.required],
      clientLastName: ['', Validators.required],
      clientPhone: [''],
    });
  }

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.branchService.getMyBranch().subscribe({
      next: (branch) => {
        this.branches.set([branch]);
        if (!this.appointmentForm.get('branchId')?.value) {
          this.appointmentForm.patchValue({ branchId: branch.id });
        }
      },
      error: () => this.errorMessage.set('No se pudo cargar la sucursal del negocio.'),
    });

    this.servicesService.getServices().subscribe({
      next: (services) => this.services.set(services.filter((service) => service.isActive !== false)),
      error: () => this.errorMessage.set('No se pudieron cargar los servicios.'),
    });
  }

  open(data?: { date?: Date, hour?: number, appointment?: Appointment }) {
    this.isOpen.set(true);
    this.isEdit.set(!!data?.appointment);
    this.errorMessage.set('');
    this.appointment.set(data?.appointment || null);

    this.appointmentForm.reset({
      branchId: this.branches()[0]?.id || '',
      serviceId: '',
      date: '',
      startTime: '',
      notes: '',
      clientEmail: '',
      clientFirstName: '',
      clientLastName: '',
      clientPhone: '',
    });

    if (data?.appointment) {
      const appointmentDate = new Date(data.appointment.startTime);
      this.appointmentForm.patchValue({
        branchId: data.appointment.branchId,
        serviceId: data.appointment.serviceId,
        date: appointmentDate.toISOString().split('T')[0],
        startTime: appointmentDate.getUTCHours().toString().padStart(2, '0') + ':00',
        notes: data.appointment.notes,
        clientEmail: data.appointment.client?.email,
        clientFirstName: data.appointment.client?.firstName,
        clientLastName: data.appointment.client?.lastName,
      });
    } else if (data?.date) {
      const dateStr = data.date.toISOString().split('T')[0];
      this.appointmentForm.patchValue({
        date: dateStr,
        startTime: data.hour !== undefined ? data.hour.toString().padStart(2, '0') + ':00' : ''
      });
    }
  }

  close() {
    this.isOpen.set(false);
    this.appointmentForm.reset();
  }

  save() {
    if (this.isEdit()) return;
    if (this.appointmentForm.invalid) {
      this.appointmentForm.markAllAsTouched();
      this.errorMessage.set('Completa los campos obligatorios para confirmar la cita.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    const val = this.appointmentForm.value;
    
    // Construct startTime (assumes HH:00 per plan)
    const startTimePayload = `${val.date}T${val.startTime}:00.000Z`;

    const payload = {
      branchId: val.branchId,
      serviceId: val.serviceId,
      startTime: startTimePayload,
      notes: val.notes,
      clientInfo: {
        email: val.clientEmail,
        firstName: val.clientFirstName,
        lastName: val.clientLastName,
        phone: val.clientPhone || undefined,
        termsAccepted: true
      }
    };

    if (this.isEdit()) {
      // Logic for reschedule or update status
    } else {
      this.appointmentService.create(payload).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.appointmentSaved.emit();
          this.close();
        },
        error: (error) => {
          this.errorMessage.set(this.readErrorMessage(error, 'No se pudo guardar la cita.'));
          this.isLoading.set(false);
        }
      });
    }
  }

  deleteAppointment() {
    const appointment = this.appointment();
    if (!appointment) return;
    if (!confirm('¿Seguro que deseas cancelar esta cita? El horario volverá a quedar disponible.')) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.appointmentService.cancel(appointment.id).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.appointmentSaved.emit();
        this.close();
      },
      error: (error) => {
        this.errorMessage.set(this.readErrorMessage(error, 'No se pudo cancelar la cita.'));
        this.isLoading.set(false);
      },
    });
  }

  private readErrorMessage(error: any, fallback: string): string {
    const message = error?.error?.message;
    if (Array.isArray(message)) return message.join(' ');
    return message || fallback;
  }
}
