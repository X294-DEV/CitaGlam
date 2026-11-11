---
title: "[S0-02] Cerrar la fuga de datos del User en la reserva pública"
labels: sprint-0,pareja-1,backend,seguridad
assignee: adg160123-cyber
---
## Objetivo
`POST /appointments/public` devuelve la cita con `include: { client: true }` (`apps/cgbg-backend/src/appointments/appointments.service.ts`, líneas ~103-109), es decir, el registro completo del `User`: hash de contraseña, `activationToken` y `resetPasswordToken`. Además, el `upsert` por email (líneas ~45-67) permite sobrescribir nombre y teléfono de cualquier cuenta existente, incluidas las de administradores. Es crítico.

## Alcance
- Reemplazar todos los `include: { client: true }` por `select` explícito con solo `id`, `firstName`, `lastName` (y `email` solo donde el panel lo necesite). Revisar también `tenant: true`.
- Dejar de actualizar cuentas existentes en la reserva pública. Si el correo pertenece a un usuario con rol distinto de `CLIENT`, responder con un error genérico (409) y **no modificar nada**.
- Esta es una solución provisional: la solución definitiva es el modelo `Customer` del Sprint 1, que elimina el `upsert` sobre `User`. Aceptamos por ahora que el 409 revela que el correo existe.
- Revisar otros endpoints que devuelvan `User` completo (`clients`, `auth`, `users`, `dashboard`).

## Criterios de aceptación
- [ ] Reservar con el correo de un ADMIN existente no devuelve `password`, `activationToken` ni `resetPasswordToken`, y no cambia su nombre.
- [ ] La respuesta de una reserva normal no contiene ningún campo de token ni contraseña (verificar con una petición real y pegar el JSON, sin datos reales, en el PR).
- [ ] `npm run build --workspace apps/cgbg-backend` pasa.

## Dependencias
Ninguna.

## Responsable
Pareja 1 (Aioria).
