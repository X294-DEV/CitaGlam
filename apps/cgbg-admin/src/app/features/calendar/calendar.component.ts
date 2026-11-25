import { Component, OnInit, signal, inject, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Info, CheckCircle, Clock } from 'lucide-angular';
import { AppointmentService, Appointment } from '../../core/services/appointment.service';
import { AppointmentModalComponent } from './appointment-modal/appointment-modal.component';
import { BranchService, Branch } from '../../core/services/branch.service';
import { dateFromKey, dayKeyOf, localDateKey, localHour, localTime, todayKey } from '../../core/utils/branch-time';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addMonths, format, isSameDay, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface CalendarDay {
  date: Date;
  label: string;
  dayNumber: string;
  isToday: boolean;
  isCurrentMonth: boolean;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, AppointmentModalComponent],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css'
})
export class CalendarComponent implements OnInit {
  private appointmentService = inject(AppointmentService);
  private branchService = inject(BranchService);

  @ViewChild('appointmentModal') appointmentModal!: AppointmentModalComponent;

  view = signal<'day' | 'week' | 'month'>('week');
  currentDate = signal(new Date());
  appointments = signal<Appointment[]>([]);
  isLoading = signal(false);
  branch = signal<Branch | null>(null);
  loadError = signal('');

  /** Zona de la sucursal: "hoy" y todas las horas se calculan aquí, no con la zona del navegador. */
  timezone = computed(() => this.branch()?.timezone ?? null);

  // Time grid definition (09:00 to 20:00 as common range, can be dynamic later)
  hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8am to 9pm

  visibleDays = computed<CalendarDay[]>(() => {
    const current = this.currentDate();
    const view = this.view();
    let start: Date;
    let length: number;

    if (view === 'day') {
      start = current;
      length = 1;
    } else if (view === 'month') {
      start = startOfWeek(startOfMonth(current), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(current), { weekStartsOn: 1 });
      length = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
    } else {
      start = startOfWeek(current, { weekStartsOn: 1 });
      length = 7;
    }

    return Array.from({ length }, (_, i) => {
      const date = addDays(start, i);
      return {
        date,
        label: format(date, 'eee d', { locale: es }),
        dayNumber: format(date, 'd', { locale: es }),
        isToday: dayKeyOf(date) === this.todayKeyInBranch(),
        isCurrentMonth: isSameMonth(date, current)
      };
    });
  });

  dateLabel = computed(() => {
    const current = this.currentDate();
    if (this.view() === 'day') {
      return format(current, 'eeee d MMMM yyyy', { locale: es });
    }

    if (this.view() === 'month') {
      return format(current, 'MMMM yyyy', { locale: es });
    }

    const start = startOfWeek(current, { weekStartsOn: 1 });
    const end = addDays(start, 6);
    return `${format(start, 'd MMM', { locale: es })} - ${format(end, 'd MMM yyyy', { locale: es })}`;
  });

  ngOnInit(): void {
    this.branchService.getMyBranch().subscribe({
      next: (branch) => {
        this.branch.set(branch);
        this.currentDate.set(dateFromKey(todayKey(branch.timezone)));
      },
      error: () => this.loadError.set('No se pudo cargar la sucursal del negocio, por lo que no se puede mostrar la agenda.'),
    });
    this.loadAppointments();
  }

  loadAppointments() {
    this.isLoading.set(true);
    this.appointmentService.getAppointments().subscribe({
      next: (data) => {
        this.appointments.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  private todayKeyInBranch(): string | null {
    const timezone = this.timezone();
    return timezone ? todayKey(timezone) : null;
  }

  /** Horario de la cita en la zona de su sucursal, por ejemplo "09:30 – 10:15". */
  appointmentRange(app: Appointment): string {
    const timezone = app.branch.timezone;
    return `${localTime(app.startTime, timezone)} – ${localTime(app.endTime, timezone)}`;
  }

  next() {
    if (this.view() === 'month') {
      this.currentDate.set(addMonths(this.currentDate(), 1));
      return;
    }

    this.currentDate.set(addDays(this.currentDate(), this.view() === 'week' ? 7 : 1));
  }

  prev() {
    if (this.view() === 'month') {
      this.currentDate.set(addMonths(this.currentDate(), -1));
      return;
    }

    this.currentDate.set(addDays(this.currentDate(), this.view() === 'week' ? -7 : -1));
  }

  today() {
    const timezone = this.timezone();
    this.currentDate.set(timezone ? dateFromKey(todayKey(timezone)) : new Date());
  }

  setView(view: 'day' | 'week' | 'month') {
    this.view.set(view);
  }

  /** Citas que empiezan en esa hora del día (en la zona de la sucursal de cada cita). */
  getAppointmentsForDayAndHour(date: Date, hour: number): Appointment[] {
    const key = dayKeyOf(date);
    return this.appointments().filter(app =>
      localDateKey(app.startTime, app.branch.timezone) === key && localHour(app.startTime, app.branch.timezone) === hour
    );
  }

  getAppointmentsForDay(date: Date): Appointment[] {
    const key = dayKeyOf(date);
    return this.appointments()
      .filter(app => localDateKey(app.startTime, app.branch.timezone) === key)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  onNewAppointmentClick() {
    this.appointmentModal.open({ date: dayKeyOf(this.currentDate()) });
  }

  onCellClick(day: Date, hour?: number) {
    this.appointmentModal.open({ date: dayKeyOf(day), hour });
  }

  onAppointmentClick(app: Appointment) {
    this.appointmentModal.open({ appointment: app });
  }
}
