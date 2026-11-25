/**
 * Fechas del sitio público. Los instantes llegan en ISO con zona y siempre se
 * muestran en la zona de la sucursal, nunca en la del navegador ni en UTC fijo.
 */

/** Fecha de hoy (YYYY-MM-DD) en la zona indicada. */
export function todayInZone(zone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function formatTime(value: string, zone: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeStyle: "short",
    hour12: false,
    timeZone: zone,
  }).format(new Date(value));
}

/** Rango "10:00–11:30" en la zona de la sucursal. */
export function formatRange(start: string, end: string, zone: string): string {
  return `${formatTime(start, zone)}–${formatTime(end, zone)}`;
}

/** "viernes, 20 de noviembre de 2026, 10:00" en la zona de la sucursal. */
export function formatDateTime(value: string, zone: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "full",
    timeStyle: "short",
    hour12: false,
    timeZone: zone,
  }).format(new Date(value));
}

/** "viernes, 20 de noviembre de 2026" en la zona de la sucursal. */
export function formatDate(value: string, zone: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "full",
    timeZone: zone,
  }).format(new Date(value));
}
