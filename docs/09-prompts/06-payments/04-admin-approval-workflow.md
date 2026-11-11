# Prompt: REQ-PAY-04 - Flujo de Autorización y Aprobación (Panel Admin)

**Objetivo**: Implementar la funcionalidad para que el Tenant pueda visualizar los comprobantes cargados por sus clientes y autorizar o rechazar la cita desde su panel administrativo.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-backend/src/modules/bookings/bookings.controller.ts`

---

## 🛠️ Instrucciones de Ejecución

Implementa el flujo de gestión de citas en estado de aprobación.

### 1. Consulta de Pendientes (`GET /bookings/pending-approval`)
- Retorna la lista de citas con estatus `WAITING_APPROVAL` filtradas por `tenantId` del administrador logueado.
- Incluye: `id`, `customerName`, `service`, `dateTime`, `receiptUrl`.

### 2. Autorización de Cita (`PATCH /bookings/authorize/:id`)
- Recibe el `id` de la cita.
- Validar propiedad del Tenant.
- Acción: Cambiar `status` de `WAITING_APPROVAL` a `AUTHORIZED`.
- **Simulación Debug**: Print en consola: `[DEBUG] Cita ${id} enviada a Notificaciones: "Tu cita ha sido confirmada"`.

### 3. Rechazo de Cita (`PATCH /bookings/reject/:id`)
- Recibe el `id` de la cita y el motivo (opcional).
- Acción: Cambiar `status` a `CANCELLED`.
- Libera el espacio (Slot) en el Motor de Disponibilidad.

---

## 📖 Contexto de Soporte
- La autorización es el paso final del flujo de pago manual.
- Revisa el **Sistema de Estados (04-tecnico)** para la coherencia en la máquina de estados de la cita.

**¿Se ha implementado el flujo de aprobación administrativa correctamente?**
