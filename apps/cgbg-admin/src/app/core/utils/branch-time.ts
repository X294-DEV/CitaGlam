/**
 * Horas en la zona de la sucursal (identificador IANA, por ejemplo America/Mexico_City).
 *
 * El backend entrega instantes ISO en UTC (con `Z`). Para mostrarlos se usa la zona de la
 * sucursal y nunca la del navegador, de modo que dos navegadores en zonas distintas vean
 * las mismas horas. No se agrega `Z` a horas locales: las horas que se envían salen de los
 * horarios disponibles que calcula el backend.
 */

const formatters = new Map<string, Intl.DateTimeFormat>();

interface ZonedParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
}

function partsOf(iso: string, timeZone: string): ZonedParts {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  const values: Record<string, string> = {};
  for (const part of formatter.formatToParts(new Date(iso))) {
    values[part.type] = part.value;
  }
  return {
    year: values['year'] ?? '',
    month: values['month'] ?? '',
    day: values['day'] ?? '',
    hour: values['hour'] ?? '',
    minute: values['minute'] ?? '',
  };
}

/** Fecha `YYYY-MM-DD` del instante, vista en la zona indicada. */
export function localDateKey(iso: string, timeZone: string): string {
  const p = partsOf(iso, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Hora del día (0-23) del instante, vista en la zona indicada. */
export function localHour(iso: string, timeZone: string): number {
  return Number(partsOf(iso, timeZone).hour);
}

/** Hora `HH:mm` del instante, vista en la zona indicada. */
export function localTime(iso: string, timeZone: string): string {
  const p = partsOf(iso, timeZone);
  return `${p.hour}:${p.minute}`;
}

/** Fecha y hora `dd/MM/yyyy HH:mm`, vistas en la zona indicada. */
export function localDateTime(iso: string, timeZone: string): string {
  const p = partsOf(iso, timeZone);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

/** Fecha corta `dd/MM/yyyy`, vista en la zona indicada. */
export function localDateShort(iso: string, timeZone: string): string {
  const p = partsOf(iso, timeZone);
  return `${p.day}/${p.month}/${p.year}`;
}

/** Fecha larga en español (por ejemplo "lunes, 23 de noviembre de 2026") en la zona indicada. */
export function localDateLong(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

/** Fecha de hoy `YYYY-MM-DD` en la zona indicada. */
export function todayKey(timeZone: string): string {
  return localDateKey(new Date().toISOString(), timeZone);
}

/** `YYYY-MM-DD` de un día de calendario armado con fecha local (año, mes y día locales de `date`). */
export function dayKeyOf(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Día de calendario (a medianoche local) a partir de `YYYY-MM-DD`, sin pasar por UTC. */
export function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}
