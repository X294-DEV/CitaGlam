---
title: "[S0-10] Validar que la sucursal pertenezca al negocio y el estado al reprogramar"
labels: sprint-0,pareja-1,backend,seguridad,bug
assignee: adg160123-cyber
---
## Objetivo
Dos huecos en `appointments.service.ts`: al crear una cita solo se usa el `tenantId` del servicio y nunca se comprueba que `dto.branchId` pertenezca a ese mismo tenant; y `reschedule()` no valida el estado de la cita ni excluye la propia cita del cálculo de ocupación.

## Alcance
- En `create()`, cargar la sucursal y verificar que `branch.tenantId === service.tenantId`; si no, 404.
- En `reschedule()`, permitir solo estados `PENDING_PAYMENT`, `WAITING_APPROVAL` y `AUTHORIZED`, y excluir la cita actual al comprobar disponibilidad.
- Revisar que `AvailabilityService` no acepte una sucursal ajena al servicio.

## Criterios de aceptación
- [ ] Reservar un servicio del negocio A con una sucursal del negocio B devuelve 404.
- [ ] Reprogramar una cita `COMPLETED` o `CANCELLED` devuelve 400.
- [ ] Reprogramar una cita a su mismo horario no da conflicto consigo misma.
- [ ] `npm run build --workspace apps/cgbg-backend` pasa.

## Dependencias
Ninguna.

## Responsable
Pareja 1 (Aioria).
