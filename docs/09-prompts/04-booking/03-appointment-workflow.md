# Prompt: REQ-BOK-03 - Canal de Creación de Citas y Publicación de Eventos

**Objetivo**: Implementar el proceso de reserva de cita, persistencia en **UTC** y activación del flujo asíncrono para el pago mediante **RabbitMQ**.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-backend/src/modules/bookings/bookings.controller.ts`

---

## 🛠️ Instrucciones de Ejecución

Implementa el endpoint de reserva siguiendo estas especificaciones:

### 1. DTO de Reserva (`create-appointment.dto.ts`)
- `branchId`, `serviceId`, `customerId`.
- `dateTime`: ISO String (Normalizada a hora cerrada UTC).
- `termsAccepted`: Booleano (Obligatorio true).

### 2. Controlador de Citas (`POST /appointments`)
- Protegido por `JwtAuthGuard`.
- Valida que el usuario sea el `CUSTOMER` o `TENANT` administrador.
- Llama a `bookingsService.create()`.

### 3. Servicio de Citas (`bookings.service.ts`)
- **Validación Final**: Verifica que la hora seleccionada siga disponible (Race condition check).
- **Persistencia**:
    - Crea la cita en tabla `Appointment`.
    - `status`: `PENDING_PAYMENT`.
    - `paymentExpiry`: Fecha actual + **24 horas** (UTC).
- **Evento RabbitMQ**: Cubre la publicación del mensaje `appointment.created` al Exchange de notificaciones.

### 4. Integración con `DateHelper`
- Asegura que `dateTime` se redondee a hora cerrada (REQ-BOK-01) antes de guardar en la DB.

---

## 📖 Contexto de Soporte
- La persistencia en la base de datos **PostgreSQL** debe ser consistente en **UTC**.
- Revisa el **Payload de Notificaciones (04-tecnico)** para la estructura del mensaje de RabbitMQ.

**¿Se ha implementado el endpoint de reservación y el envío de eventos correctamente?**
