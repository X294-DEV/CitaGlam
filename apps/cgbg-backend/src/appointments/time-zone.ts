import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '@cgbg/prisma';

export function validateTimeZone(zone: string): string {
  if (typeof zone !== 'string' || !zone || /^[+-]/.test(zone)) throw new BadRequestException('Zona horaria IANA inválida.');
  try { new Intl.DateTimeFormat('en', { timeZone: zone }).format(); }
  catch { throw new BadRequestException('Zona horaria IANA inválida.'); }
  return zone;
}

export function parseInstant(value: string): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new BadRequestException('La fecha debe ser ISO 8601 con zona explícita.');
  }
  validateLocalDate(value.slice(0, 10));
  return new Date(value);
}

export function validateLocalDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) ||
      new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) {
    throw new BadRequestException('date debe ser una fecha válida YYYY-MM-DD.');
  }
  return value;
}

function parts(date: Date, zone: string) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map(p => [p.type, p.value]));
}
export function localDate(date: Date, zone: string): string {
  const p = parts(date, zone); return `${p.year}-${p.month}-${p.day}`;
}
export function localTime(date: Date, zone: string): string {
  const p = parts(date, zone); return `${p.hour}:${p.minute}`;
}
export function displayDate(date: Date, zone: string): string {
  const p = parts(date, zone); return `${p.day}/${p.month}/${p.year}`;
}
export async function wallTime(prisma: PrismaService, date: string, time: string, zone: string): Promise<Date> {
  validateLocalDate(date); validateTimeZone(zone);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new BadRequestException('Horario de sucursal inválido.');
  const [row] = await prisma.$queryRaw<{ instant: Date }[]>`
    SELECT (${date}::date + ${time}::time) AT TIME ZONE ${zone} AS instant`;
  return row.instant;
}
