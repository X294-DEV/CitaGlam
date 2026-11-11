# Prompt: REQ-SER-04 - Gestión de Días No Laborables (Excepciones)

**Objetivo**: Implementar la funcionalidad para que el Tenant pueda bloquear fechas específicas en su calendario (feriados, vacaciones, mantenimiento) sin alterar su horario base.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-backend/src/modules/services/`

---

## 🛠️ Instrucciones de Ejecución

Implementa la gestión de excepciones de calendario.

### 1. DTO de Día No Laboral (`non-working-day.dto.ts`)
- `date`: Fecha bloqueada (ISO String).
- `description`: Motivo (ej: "Día de la Independencia").

### 2. ServicesService (`services.service.ts`) / ExceptionsService
- Implementa `addNonWorkingDay(tenantId, data)`:
    - Inserta la fecha bloqueada vinculada al `tenantId`.
- Implementa `getNonWorkingDays(tenantId)`: Lista los bloqueos vigentes.
- Implementa `removeNonWorkingDay(id, tenantId)`: Elimina la excepción.

### 3. Controlador de Servicios (`services.controller.ts`)
- **GET `/services/exceptions`**: Lista días bloqueados.
- **POST `/services/exceptions`**: Agrega nuevo bloqueo.
- **DELETE `/services/exceptions/:id`**: Libera el día.
- Protegido por `JwtAuthGuard`.

---

## 📖 Contexto de Soporte
- Consulta el documento de **Motor de Reservas (04-booking)** para entender cómo estas fechas bloqueadas filtran los slots disponibles.
- Los bloqueos deben persistirse en **UTC** para consistencia global.

**¿Se ha implementado la gestión de excepciones de agenda correctamente?**
