# Prompt: REQ-PAY-01 - Infraestructura de Mensajería (RabbitMQ)

**Objetivo**: Implementar la comunicación asíncrona entre el **Backend (API)** y el **Worker** utilizando **RabbitMQ** para gestionar el flujo de notificaciones y pagos.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-backend/` y `docs/07-codigo/cgbg-webapp/apps/cgbg-worker/`

---

## 🛠️ Instrucciones de Ejecución

Implementa el sistema de eventos asíncronos.

### 1. Backend: Productor de Eventos (`MessagingService`)
- Configura un cliente de RabbitMQ (ej: `@nestjs/microservices` o `amqp-connection-manager`).
- Implementa `emitAppointmentCreated(payload)`:
    - Publica un mensaje al exchange `cgbg.appointments` con el routing key `appointment.created`.
    - El payload debe incluir `appointmentId`, `tenantId`, `customerId`, `dateTime` y `amount`.

### 2. Worker: Consumidor de Eventos (`AppointmentConsumer`)
- Crea una aplicación NestJS Minimalista (o Node puro) en `apps/cgbg-worker`.
- Escucha la cola `cgbg.notifications.queue`.
- **Lógica de Simulación**:
    - Al recibir el mensaje, imprime en consola: `[DEBUG] Notificación de Cita: Enviando link de pago para la cita ${appointmentId} al cliente ${customerId}...`.

---

## 📖 Contexto de Soporte
- Consulta el documento de **Técnico (04)** para el payload estricto del evento.
- Asegura que el Worker tenga acceso a la URL de RabbitMQ desde el `.env`.

**¿Se ha configurado la infraestructura de RabbitMQ y el consumidor correctamente?**
