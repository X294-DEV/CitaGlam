---
title: "[S0-09] Límite de peticiones en la reserva pública y en los endpoints de auth"
labels: sprint-0,pareja-4,backend,seguridad
assignee: X294-DEV
---
## Objetivo
No hay ningún límite de peticiones. Cualquiera puede llamar a `POST /appointments/public` en bucle con correos falsos y apartar todos los horarios de un negocio por 24 horas, o intentar contraseñas sin freno en el login.

## Alcance
- Instalar `@nestjs/throttler` y aplicarlo globalmente con un límite razonable, más estricto en `POST /appointments/public`, `POST /auth/login`, `POST /auth/register` y `POST /receipts/upload/:token`.
- Responder 429 con un mensaje claro.
- El captcha (Turnstile) en la reserva pública es del Sprint 1; dejar el punto de integración documentado.

## Criterios de aceptación
- [ ] Más de N reservas por minuto desde una misma IP reciben 429 (documentar el valor elegido).
- [ ] El uso normal del panel no se ve afectado.
- [ ] `npm run build --workspace apps/cgbg-backend` pasa.

## Dependencias
Toca `app.module.ts` y controladores de la pareja 1: coordinar para evitar conflictos.

## Responsable
Pareja 4 (Adrián).
