import { Pipe, PipeTransform } from '@angular/core';
import { localDateLong, localDateShort, localDateTime, localTime } from '../../core/utils/branch-time';

export type ZonedFormat = 'time' | 'date' | 'dateLong' | 'dateTime';

/**
 * Muestra un instante en la zona de la sucursal, no en la del navegador.
 * Uso: `{{ app.startTime | zoned: app.branch.timezone : 'time' }}`.
 */
@Pipe({ name: 'zoned', standalone: true })
export class ZonedDatePipe implements PipeTransform {
  transform(value: string | null | undefined, timeZone: string | null | undefined, format: ZonedFormat = 'dateTime'): string {
    if (!value || !timeZone) return '';
    switch (format) {
      case 'time':
        return localTime(value, timeZone);
      case 'date':
        return localDateShort(value, timeZone);
      case 'dateLong':
        return localDateLong(value, timeZone);
      default:
        return localDateTime(value, timeZone);
    }
  }
}
