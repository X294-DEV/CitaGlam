---
title: "[S0-06] Documento de diseño: pg-boss y token de pago en PostgreSQL"
labels: sprint-0,pareja-2,docs,backend
assignee: abalam915-eng
---
## Objetivo
Dejar decidido y escrito, antes del Sprint 2, cómo se reemplazan RabbitMQ y Redis. Hoy el token de pago vive solo en Redis (si se reinicia, todos los links mueren), el worker no se reconecta si arranca antes que la infraestructura, y los mensajes que fallan se descartan sin rastro.

## Alcance
Documento corto (1-2 páginas) en `docs/decisiones/0001-cola-y-token-de-pago.md` que cubra:
- Modelo `PaymentLink` (`appointmentId`, `tokenHash`, `expiresAt`, `usedAt`), creado en la misma transacción que la cita. Token guardado con hash, vigencia de 30 a 60 minutos.
- Uso de pg-boss dentro del mismo proceso del backend (sin servicio de worker aparte): trabajos de envío de correo/WhatsApp, recordatorios 24 h antes, vencimiento de citas sin pago.
- Reintentos, errores visibles y cola de mensajes fallidos.
- Qué se elimina (Redis, RabbitMQ, `apps/cgbg-worker`) y en qué orden, para no romper la demo.
- Cambios que necesita de la pareja 1 (migración de `PaymentLink`) y de la pareja 4 (docker-compose).

## Criterios de aceptación
- [ ] Documento revisado y aprobado por las parejas 1 y 4.
- [ ] Lista de issues del Sprint 2 derivada del documento.

## Dependencias
Ninguna. Alimenta el Sprint 2.

## Responsable
Pareja 2 (Ángel).
