import { ConflictException } from '@nestjs/common';

/** La comprobación previa mejora UX; esta traducción cubre la carrera protegida por PostgreSQL. */
export async function saveWithSlotConflict<T>(write: () => Promise<T>): Promise<T> {
  try { return await write(); }
  catch (error) {
    const detail = error instanceof Error ? error.message : '';
    const meta = typeof error === 'object' && error !== null && 'meta' in error ? JSON.stringify(error.meta) : '';
    if (/23P01|appointment_no_overlap/.test(detail + meta)) {
      throw new ConflictException('El horario seleccionado ya no está disponible.');
    }
    throw error;
  }
}
