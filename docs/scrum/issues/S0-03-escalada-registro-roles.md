---
title: "[S0-03] Cerrar la escalada de privilegios por registro y exigir roles"
labels: sprint-0,pareja-1,backend,seguridad
assignee: adg160123-cyber
---
## Objetivo
Hoy cualquier persona puede operar las citas de otro negocio: `GET /tenants/config/:slug` es público y devuelve el `id` del tenant; `POST /auth/register` acepta `tenantId` del cuerpo (`register.dto.ts` línea 24, `auth.service.ts` línea ~43); y los endpoints de citas (`appointments.controller.ts`, líneas ~49-102) solo exigen JWT, sin verificar rol. Un "cliente" registrado así puede leer citas, aprobar o rechazar pagos y cancelar.

## Alcance
- Quitar `tenantId` del `RegisterDto` y del `register()` (un registro público nunca debe elegir tenant).
- Aplicar `RolesGuard` con `@Roles('ADMIN', 'STAFF')` a los endpoints de panel de `appointments` (`merchant`, `pending-approval`, `approve`, `reject`, `DELETE`, `status`, `reschedule`).
- Revisar y proteger igual los controladores `clients`, `dashboard` y `notifications`, que no se auditaron a fondo.
- Si `user.tenantId` es nulo, responder 403 en lugar de consultar datos.

## Criterios de aceptación
- [ ] Registrar un usuario con `tenantId` ajeno no lo asocia a ese tenant.
- [ ] Un usuario `CLIENT` activado recibe 403 en `GET /appointments/merchant` y en `PATCH /appointments/:id/approve`.
- [ ] Un `ADMIN` del tenant sigue funcionando en el panel.
- [ ] `npm run build --workspace apps/cgbg-backend` pasa.

## Dependencias
Avisar a la pareja 3 si algún endpoint cambia de contrato.

## Responsable
Pareja 1 (Aioria).
