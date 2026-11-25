import { Component, inject, signal, computed, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule, X, User, Scissors, Calendar as IconCalendar, Clock, AlignLeft, Info, Check, Trash2 } from 'lucide-angular';
import type { AvailabilitySlot } from '@cgbg/shared-types';
import { AppointmentService, Appointment } from '../../../core/services/appointment.service';
import { BranchService, Branch } from '../../../core/services/branch.service';
import { ServicesService, Service } from '../../../core/services/services.service';
import { ClientService, Client } from '../../../core/services/client.service';
import { localHour } from '../../../core/utils/branch-time';
import { ZonedDatePipe } from '../../../shared/zoned-date/zoned-date.pipe';

@Component({
  selector: 'app-appointment-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LucideAngularModule, ZonedDatePipe],
  templateUrl: './appointment-modal.component.html',
  styleUrl: './appointment-modal.component.css'
})
export class AppointmentModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private appointmentService = inject(AppointmentService);
  private branchService = inject(BranchService);
  private servicesService = inject(ServicesService);
  private clientService = inject(ClientService);

  @Output() appointmentSaved = new EventEmitter<void>();

  isOpen = signal(false);
  isEdit = signal(false);
  isLoading = signal(false);
  slotsLoading = signal(false);
  errorMessage = signal('');
  appointment = signal<Appointment | null>(null);

  appointmentForm: FormGroup;
  branches = signal<Branch[]>([]);
  services = signal<Service[]>([]);
  customers = signal<Client[]>([]);
  /** Horarios libres que calcula el backend (duración real del servicio, en la zona de la sucursal). */
  availableSlots = signal<AvailabilitySlot[]>([]);
  /** Hora (0-23, en la zona de la sucursal) que se intenta preseleccionar al abrir desde una celda. */
  private preferredHour: number | null = null;

  /** Zona horaria con la que se muestran todas las horas del modal: la de la sucursal. */
  timezone = computed(() => {
    const appointment = this.appointment();
    if (appointment) return appointment.branch.timezone;
    return this.branches()[0]?.timezone ?? null;
  });

  /** Solo se puede reprogramar una cita que sigue activa. */
  canReschedule = computed(() => {
    const status = this.appointment()?.status;
    return !!status && status !== 'CANCELLED' && status !== 'COMPLETED';
  });

  constructor() {
    this.appointmentForm = this.fb.group({
      customerId: ['', Validators.required],
      branchId: ['', Validators.required],
      serviceId: ['', Validators.required],
      date: ['', Validators.required],
      startTime: ['', Validators.required],
      notes: [''],
      reason: [''],
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

    this.clientService.getClients().subscribe({
      next: (customers) => this.customers.set(customers),
      error: () => this.errorMessage.set('No se pudo cargar la lista de clientes.'),
    });
  }

  /**
   * `date` es un día de calendario `YYYY-MM-DD` (en la zona de la sucursal) y `hour` la hora
   * preferida; la hora final siempre sale de los horarios disponibles, no se arma en el panel.
   */
  open(data?: { date?: string; hour?: number; appointment?: Appointment }) {
    this.isOpen.set(true);
    this.isEdit.set(!!data?.appointment);
    this.errorMessage.set('');
    this.appointment.set(data?.appointment || null);
    this.availableSlots.set([]);
    this.preferredHour = data?.hour ?? null;

    this.appointmentForm.reset({
      customerId: '',
      branchId: this.branches()[0]?.id || '',
      serviceId: '',
      date: '',
      startTime: '',
      notes: '',
      reason: '',
    });

    if (data?.appointment) {
      // Al reprogramar solo cambian fecha y hora; cliente y servicio quedan fijos.
      this.appointmentForm.patchValue({
        customerId: data.appointment.customerId,
        branchId: data.appointment.branchId,
        serviceId: data.appointment.serviceId,
        notes: data.appointment.notes ?? '',
      });
    } else if (data?.date) {
      this.appointmentForm.patchValue({ date: data.date });
      this.loadSlots();
    }
  }

  close() {
    this.isOpen.set(false);
    this.appointmentForm.reset();
  }

  /** Pide al backend los horarios libres del día para el servicio elegido. */
  loadSlots() {
    const { branchId, serviceId, date } = this.appointmentForm.value;
    this.appointmentForm.patchValue({ startTime: '' });
    this.availableSlots.set([]);
    if (!branchId || !serviceId || !date) return;

    this.slotsLoading.set(true);
    this.appointmentService.getAvailability(branchId, serviceId, date).subscribe({
      next: (slots) => {
        this.availableSlots.set(slots);
        this.slotsLoading.set(false);
        const timezone = this.timezone();
        if (this.preferredHour !== null && timezone) {
          const preferred = slots.find((slot) => localHour(slot.startTime, timezone) === this.preferredHour);
          if (preferred) this.appointmentForm.patchValue({ startTime: preferred.startTime });
          this.preferredHour = null;
        }
      },
      error: (error) => {
        this.errorMessage.set(this.readErrorMessage(error, 'No se pudieron cargar los horarios disponibles.'));
        this.slotsLoading.set(false);
      },
    });
  }

  save() {
    if (this.isEdit()) {
      this.reschedule();
      return;
    }
    if (this.appointmentForm.invalid) {
      this.appointmentForm.markAllAsTouched();
      this.errorMessage.set('Completa los campos obligatorios para confirmar la cita.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    const val = this.appointmentForm.value;

    // Contrato S1-05: customerId y el instante exacto del horario elegido. El panel no envía
    // `termsAccepted`: el consentimiento solo existe en la reserva pública.
    this.appointmentService.create({
      customerId: val.customerId,
      branchId: val.branchId,
      serviceId: val.serviceId,
      startTime: val.startTime,
      notes: val.notes || undefined,
    }).subscribe({
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

  private reschedule() {
    const appointment = this.appointment();
    if (!appointment) return;
    const { startTime, reason } = this.appointmentForm.value;
    if (!startTime) {
      this.errorMessage.set('Elige la nueva fecha y un horario disponible.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.appointmentService.reschedule(appointment.id, {
      newStartTime: startTime,
      reason: reason || undefined,
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.appointmentSaved.emit();
        this.close();
      },
      error: (error) => {
        // 409: otro horario ocupó el lugar; se recargan los horarios para no ofrecer uno viejo.
        this.errorMessage.set(this.readErrorMessage(error, 'No se pudo reprogramar la cita.'));
        this.isLoading.set(false);
        this.loadSlots();
      }
    });
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
