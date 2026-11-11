# Prompt: REQ-SER-03 - Gestión de Horarios Semanales (WorkSchedule)

**Objetivo**: Implementar la configuración de los horarios de atención recurrentes de cada Tenant, utilizando **números enteros** para las horas para asegurar la compatibilidad con el motor de slots de 1h.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-backend/src/modules/services/`

---

## 🛠️ Instrucciones de Ejecución

Implementa la gestión de los horarios semanales.

### 1. DTO de Horario (`work-schedule.dto.ts`)
- `dayOfWeek`: Número entero (0 = Domingo, ..., 6 = Sábado).
- `startTime`: Hora de inicio (Entero: ej: 9).
- `endTime`: Hora de cierre (Entero: ej: 18).
- `lunchStart`, `lunchEnd`: Horas opcionales para bloqueo de comida.

### 2. ServicesService (`services.service.ts`) / ScheduleService
- Implementa `saveSchedule(tenantId, scheduleData[])`:
    - Recibe un array de horarios para la semana.
    - Actualiza o inserta los registros en la tabla `WorkSchedule` vinculados al `tenantId`.
- Implementa `getSchedule(tenantId)`: Retorna la configuración semanal actual.

### 3. Controlador de Servicios (`services.controller.ts`)
- **GET `/services/schedules`**: Obtiene lista de horarios por día.
- **POST `/services/schedules`**: Actualiza la configuración semanal masivamente para el Tenant.
- Protegido por `JwtAuthGuard`.

---

## 📖 Contexto de Soporte
- Consulta el documento de **Motor de Reservas (04-booking)** para entender cómo estas horas enteras se convertirán en slots disponibles.
- Los horarios deben persistirse en **UTC** si se requiere precisión global, aunque por simplicidad el Tenant los ingresa en su hora local (CDMX) y el backend los normaliza.

**¿Se ha implementado la gestión de horarios semanales correctamente?**
