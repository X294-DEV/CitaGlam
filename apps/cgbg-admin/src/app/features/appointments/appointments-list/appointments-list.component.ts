import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Appointment, AppointmentService, AppointmentStatus } from '../../../core/services/appointment.service';
import { EnvironmentService } from '../../../core/services/environment.service';

@Component({
  selector: 'app-appointments-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './appointments-list.component.html',
  styleUrl: './appointments-list.component.css',
})
export class AppointmentsListComponent implements OnInit {
  private appointmentService = inject(AppointmentService);
  private env = inject(EnvironmentService);

  appointments = signal<Appointment[]>([]);
  pendingApproval = signal<Appointment[]>([]);
  selectedAppointment = signal<Appointment | null>(null);
  isLoading = signal(false);
  actionLoadingId = signal<string | null>(null);
  openActionMenuId = signal<string | null>(null);
  errorMessage = signal('');
  successMessage = signal('');

  sortedAppointments = computed(() =>
    [...this.appointments()].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    ),
  );

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(clearMessages = true) {
    this.isLoading.set(true);
    if (clearMessages) {
      this.errorMessage.set('');
      this.successMessage.set('');
    }

    this.appointmentService.getAppointments().subscribe({
      next: (appointments) => {
        this.appointments.set(appointments);
        this.pendingApproval.set(appointments.filter((appointment) => appointment.status === 'WAITING_APPROVAL'));

        const selected = this.selectedAppointment();
        if (selected) {
          this.selectedAppointment.set(appointments.find((appointment) => appointment.id === selected.id) || null);
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar las citas.');
        this.isLoading.set(false);
      },
    });
  }

  selectAppointment(appointment: Appointment) {
    this.closeActionMenu();
    this.selectedAppointment.set(appointment);
  }

  closeDetails() {
    this.selectedAppointment.set(null);
  }

  toggleActionMenu(appointmentId: string) {
    this.openActionMenuId.update((current) => current === appointmentId ? null : appointmentId);
  }

  closeActionMenu() {
    this.openActionMenuId.set(null);
  }

  approvePayment(appointment: Appointment) {
    if (!window.confirm('¿Confirmar este comprobante y autorizar la cita?')) return;

    this.closeActionMenu();
    this.actionLoadingId.set(appointment.id);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.appointmentService.approve(appointment.id).subscribe({
      next: () => {
        this.successMessage.set('Pago confirmado. La cita quedó autorizada.');
        this.actionLoadingId.set(null);
        this.loadAppointments(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'No se pudo confirmar el pago.');
        this.actionLoadingId.set(null);
      },
    });
  }

  rejectPayment(appointment: Appointment) {
    const reason = window.prompt('Motivo del rechazo del comprobante:', 'Comprobante no válido o no identificable.');
    if (reason === null) return;

    this.closeActionMenu();
    this.actionLoadingId.set(appointment.id);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.appointmentService.reject(appointment.id, reason).subscribe({
      next: () => {
        this.successMessage.set('Pago rechazado. La cita quedó cancelada y el horario fue liberado.');
        this.actionLoadingId.set(null);
        this.loadAppointments(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'No se pudo rechazar el pago.');
        this.actionLoadingId.set(null);
      },
    });
  }

  cancelAppointment(appointment: Appointment) {
    if (!window.confirm('¿Cancelar esta cita? El horario volverá a quedar disponible.')) return;

    this.closeActionMenu();
    this.actionLoadingId.set(appointment.id);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.appointmentService.cancel(appointment.id).subscribe({
      next: () => {
        this.successMessage.set('La cita fue cancelada correctamente.');
        this.actionLoadingId.set(null);
        this.loadAppointments(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'No se pudo cancelar la cita.');
        this.actionLoadingId.set(null);
      },
    });
  }

  rescheduleAppointment(appointment: Appointment) {
    const currentDate = new Date(appointment.startTime).toISOString().slice(0, 10);
    const currentHour = `${new Date(appointment.startTime).getUTCHours().toString().padStart(2, '0')}:00`;
    const date = window.prompt('Nueva fecha de la cita (YYYY-MM-DD):', currentDate);
    if (!date) return;
    const time = window.prompt('Nueva hora de la cita (HH:00):', currentHour);
    if (!time) return;

    this.closeActionMenu();
    this.actionLoadingId.set(appointment.id);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.appointmentService.reschedule(appointment.id, {
      newStartTime: `${date}T${time}:00.000Z`,
      reason: 'Reprogramada desde el panel de citas',
    }).subscribe({
      next: () => {
        this.successMessage.set('La cita fue reprogramada correctamente.');
        this.actionLoadingId.set(null);
        this.loadAppointments(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'No se pudo reprogramar la cita.');
        this.actionLoadingId.set(null);
      },
    });
  }

  completeAppointment(appointment: Appointment) {
    if (!window.confirm('¿Marcar esta cita como completada?')) return;

    this.closeActionMenu();
    this.actionLoadingId.set(appointment.id);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.appointmentService.updateStatus(appointment.id, 'COMPLETED', 'Servicio finalizado desde el panel').subscribe({
      next: () => {
        this.successMessage.set('La cita quedó marcada como completada.');
        this.actionLoadingId.set(null);
        this.loadAppointments(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'No se pudo cambiar el estatus de la cita.');
        this.actionLoadingId.set(null);
      },
    });
  }

  receiptUrl(appointment: Appointment): string | null {
    const receiptUrl = appointment.payment?.receiptUrl;
    return receiptUrl ? this.env.formatUrl(receiptUrl) : null;
  }

  paymentAmount(appointment: Appointment): number {
    return Number(appointment.payment?.amount ?? appointment.service?.price ?? 0);
  }

  canCancel(appointment: Appointment): boolean {
    return appointment.status !== 'CANCELLED' && appointment.status !== 'COMPLETED';
  }

  canReschedule(appointment: Appointment): boolean {
    return appointment.status !== 'CANCELLED' && appointment.status !== 'COMPLETED';
  }

  canComplete(appointment: Appointment): boolean {
    return appointment.status === 'AUTHORIZED';
  }

  canConfirmPayment(appointment: Appointment): boolean {
    return appointment.status === 'WAITING_APPROVAL';
  }

  formatDateTime(value: Date | string): string {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
      hour12: false,
      timeZone: 'UTC',
    }).format(new Date(value));
  }

  statusLabel(status: AppointmentStatus): string {
    const labels: Record<AppointmentStatus, string> = {
      PENDING_PAYMENT: 'Pendiente de pago',
      WAITING_APPROVAL: 'Esperando aprobación',
      AUTHORIZED: 'Autorizada',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
    };

    return labels[status] || status;
  }
}
