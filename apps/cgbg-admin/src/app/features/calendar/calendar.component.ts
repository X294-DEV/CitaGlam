import { Component, OnInit, signal, inject, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Info, CheckCircle, Clock } from 'lucide-angular';
import { AppointmentService, Appointment } from '../../core/services/appointment.service';
import { AppointmentModalComponent } from './appointment-modal/appointment-modal.component';
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

  @ViewChild('appointmentModal') appointmentModal!: AppointmentModalComponent;

  view = signal<'day' | 'week' | 'month'>('week');
  currentDate = signal(new Date());
  appointments = signal<Appointment[]>([]);
  isLoading = signal(false);

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
        isToday: isSameDay(date, new Date()),
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

  private toUtcDateKey(value: Date | string): string {
    return new Date(value).toISOString().slice(0, 10);
  }

  formatAppointmentHour(app: Appointment): string {
    const date = new Date(app.startTime);
    return `${date.getUTCHours().toString().padStart(2, '0')}:00`;
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
    this.currentDate.set(new Date());
  }

  setView(view: 'day' | 'week' | 'month') {
    this.view.set(view);
  }

  getAppointmentsForDayAndHour(date: Date, hour: number): Appointment[] {
    return this.appointments().filter(app => {
      const appDate = new Date(app.startTime);
      return this.toUtcDateKey(appDate) === this.toUtcDateKey(date) && appDate.getUTCHours() === hour;
    });
  }

  getAppointmentsForDay(date: Date): Appointment[] {
    return this.appointments()
      .filter(app => this.toUtcDateKey(app.startTime) === this.toUtcDateKey(date))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  onNewAppointmentClick() {
    this.appointmentModal.open({ date: this.currentDate(), hour: 9 });
  }

  onCellClick(day: Date, hour: number) {
    this.appointmentModal.open({ date: day, hour });
  }

  onAppointmentClick(app: Appointment) {
    this.appointmentModal.open({ appointment: app });
  }
}
