# Prompt: REQ-BOK-01 - Utilidades de Fecha y Zona Horaria

**Objetivo**: Implementar un servicio de utilidades global en **NestJS** para gestionar la conversión entre el almacenamiento en **UTC** y la visualización/operación en la hora local de **Guadalajara / CDMX**.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-backend/src/common/utils/date-helper.service.ts`

---

## 🛠️ Instrucciones de Ejecución

Genera un servicio `DateHelper` que utilice la librería `luxon` o `date-fns-tz` para las siguientes operaciones:

### 1. Conversión de Zona Horaria
- **`toLocal(utcDate: Date): Date`**: Convierte una fecha UTC de la base de datos a un objeto Date en la zona `America/Mexico_City`.
- **`toUTC(localDate: Date): Date`**: Convierte una fecha local (seleccionada por el usuario) a UTC para persistencia.

### 2. Normalización de Horas Cerradas (Slots de 1h)
- **`roundToNearestHour(date: Date): Date`**: Asegura que cualquier fecha recibida se ajuste al inicio de la hora (minutos y segundos en 0).
- **`generateHourlySlots(start: number, end: number): number[]`**: Genera un array de enteros representando las horas disponibles entre un rango (ej: 9 a 18).

### 3. Formateo para UI
- Métodos para retornar strings legibles en formato 24h (ej: "14:00") desde un objeto Date local.

---

## 📖 Contexto de Soporte
- La zona horaria objetivo es **America/Mexico_City** (Guadalajara/CDMX).
- Toda la persistencia en Prisma DEBE ser en UTC.

**¿Se ha generado el servicio de utilidades de fecha correctamente?**
