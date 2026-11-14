# 0001 — Cola de trabajos y token de pago en PostgreSQL

- **Estado:** propuesta (requiere aprobación de las parejas 1 y 4)
- **Fecha:** 2026-11-14
- **Autor:** pareja 2 (Ángel)
- **Issue:** S0-06 (#6). Alimenta el Sprint 2 (19-22 nov).

## Contexto: cómo funciona hoy

1. `AppointmentsService` crea la cita con `paymentExpiry = ahora + 24 h` y, **después** de guardarla, publica `appointment.created` en RabbitMQ (`MessagingService`). Si RabbitMQ no responde, el error se registra como advertencia y el evento se pierde: la cita existe pero nunca tendrá link.
2. `apps/cgbg-worker` consume el evento, genera un UUID y lo guarda en Redis (`cgbg:payment:link:<token>` → `appointmentId`, 24 h). **No envía nada**: solo escribe el link en el log.
3. `ReceiptsService` valida y consume el token leyendo Redis. Si Redis se reinicia, todos los links mueren.
4. Si un mensaje falla, el worker hace `nack` sin reencolar: se descarta sin rastro. Si el worker arranca antes que RabbitMQ, no se reconecta.
5. El mismo worker cancela cada hora las citas `PENDING_PAYMENT` vencidas.

Son tres servicios extra (Redis, RabbitMQ, worker) para un flujo que no entrega el mensaje y pierde estado.

## Decisión

### 1. Token de pago en PostgreSQL: modelo `PaymentLink`

Propuesta de esquema (la migración la hace la pareja 1):

```prisma
model PaymentLink {
  id            String      @id @default(uuid())
  appointmentId String
  tokenHash     String      @unique   // SHA-256 hex del token; el token en claro nunca se guarda
  expiresAt     DateTime
  usedAt        DateTime?
  createdAt     DateTime    @default(now())
  appointment   Appointment @relation(fields: [appointmentId], references: [id])

  @@index([appointmentId])
}
// En Appointment: paymentLinks PaymentLink[]
```

- **Token:** 32 bytes aleatorios (`crypto.randomBytes(32).toString('base64url')`). Se manda en el link y solo se guarda su hash. SHA-256 basta porque el token tiene alta entropía (no es una contraseña).
- **Misma transacción que la cita:** hoy la reserva hace un `appointment.create` suelto, sin transacción. La cita y su `PaymentLink` deben crearse juntas dentro de un `prisma.$transaction`, para que nunca quede una cita sin link. En el Sprint 1 la restricción contra citas encimadas probablemente también la necesite.
- **Vigencia:** 60 minutos (dentro del rango 30-60 de `AGENTS.md`). **A confirmar:** hoy `paymentExpiry` es de 24 h. Propongo igualar `paymentExpiry` a `expiresAt`, para que el horario se libere cuando el link deja de servir. Si no, el horario queda apartado 23 h sin forma de pagar.
- **Un solo uso:** al subir el comprobante se marca `usedAt` en la misma transacción que pasa la cita a `WAITING_APPROVAL`. La validación busca `tokenHash` con `usedAt IS NULL AND expiresAt > now()`.
- **Reenvío (deseable):** si el negocio reenvía el link, se crea uno nuevo y los anteriores de esa cita se marcan como usados.

### 2. pg-boss dentro del proceso del backend

pg-boss guarda los trabajos en PostgreSQL (en su propio esquema `pgboss`, separado del esquema `public` de Prisma, así que no interfiere con las migraciones). Corre dentro del backend NestJS: no hay worker aparte.

| Cola | Se crea cuando | Qué hace |
| --- | --- | --- |
| `notificacion-link-pago` | Justo después de confirmar la transacción de la reserva | Envía el link por correo (y WhatsApp cuando exista). `singletonKey = appointmentId` para no duplicar envíos. |
| `recordatorio-24h` | Al confirmarse la cita (`startAfter = startTime - 24 h`) | Antes de enviar, revisa que la cita siga `CONFIRMED`. Si ya se canceló, termina sin enviar. |
| `citas-vencer-sin-pago` | Programada (`schedule`, cada 5 min) | Cancela las citas `PENDING_PAYMENT` con `paymentExpiry` vencido. Sustituye el `setInterval` del worker. |

- **Encolar después de la transacción:** pg-boss usa su propia conexión, no la de Prisma. Si el encolado falla, la cita y su link ya existen. La tarea programada de vencimiento (o una de "reenviar pendientes") puede reintentarlo, así que nada se pierde en silencio.
- **Zona horaria:** el cálculo de `startTime - 24 h` sigue la convención vigente (hora local guardada como UTC). Cuando el Sprint 1 pase a `Timestamptz` por sucursal, este cálculo se hace en UTC real sin cambiar la cola.

### 3. Reintentos, errores visibles y mensajes fallidos

- Cada cola se crea con `retryLimit: 5`, `retryDelay: 30` s y `retryBackoff: true` (30 s, 1 min, 2 min…).
- Al agotar los reintentos, el trabajo pasa a la cola `fallidos` (`deadLetter`) con su `payload` y el último error. **No se descarta nada.**
- Cada fallo queda en el log con `jobId`, cola y `appointmentId` (sin datos personales ni el token).
- Se puede consultar en `pgboss.job` (`state = 'failed'`). Un endpoint de SUPERADMIN para ver y reintentar fallidos queda como **deseable**.

### 4. Qué se elimina y en qué orden (sin romper la demo)

Cada paso es un PR que deja todo funcionando:

1. **Pareja 1:** migración de `PaymentLink` (solo agrega una tabla, no rompe nada).
2. **Pareja 2:** módulo `jobs` con pg-boss en el backend y `PaymentLinksService` (crear, validar, consumir). Todavía no se usa en la reserva.
3. **Pareja 1 + 2:** la reserva llama a `PaymentLinksService.createInTransaction(tx, appointmentId)` y encola `notificacion-link-pago`. `ReceiptsService` lee `PaymentLink` en lugar de Redis. Se deja de llamar a `MessagingService`.
4. **Pareja 2:** el vencimiento pasa a `citas-vencer-sin-pago` y el recordatorio de 24 h se agrega. Prueba de punta a punta con correo real de prueba.
5. **Pareja 4:** quitar `cgbg-redis`, `cgbg-mq` y `cgbg-worker` de `docker-compose.yml`, y `REDIS_URL`/`RMQ_URL` de `.env.example`. **Pareja 2:** borrar `apps/cgbg-worker`, `messaging/` y las dependencias `amqplib` e `ioredis`.

Los links emitidos en Redis durante la transición dejan de valer en el paso 3. Solo afecta datos de desarrollo.

## Cambios que se piden a otras parejas

- **Pareja 1:** migración de `PaymentLink` (paso 1). Llamar a `createInTransaction` dentro de la transacción de la reserva y alinear `paymentExpiry` con la vigencia acordada (paso 3).
- **Pareja 4:** limpieza de `docker-compose.yml` y `.env.example` (paso 5). Para la demo en Neon o Supabase, pg-boss necesita la **conexión directa** (no la del pooler en modo transacción), así que puede hacer falta una variable aparte, por ejemplo `DIRECT_DATABASE_URL`.

## Issues propuestos para el Sprint 2

1. `[S2] Migración PaymentLink` — pareja 1.
2. `[S2] Módulo jobs con pg-boss y PaymentLinksService` — pareja 2.
3. `[S2] Reserva crea PaymentLink en la transacción y encola el envío; receipts deja Redis` — parejas 1 y 2.
4. `[S2] Envío del link de pago por correo (plantilla y reintentos)` — pareja 2.
5. `[S2] Vencimiento de citas sin pago y recordatorio 24 h con pg-boss` — pareja 2.
6. `[S2] Quitar Redis, RabbitMQ y worker de docker-compose y .env.example` — pareja 4.
7. `[S2] Borrar apps/cgbg-worker, messaging y dependencias` — pareja 2.
8. `[S2] WhatsApp con número de prueba (plantilla de link de pago)` — pareja 2 (primero en el orden de recorte).

## Puntos abiertos (necesitan respuesta para aprobar)

1. ¿Vigencia de 60 min y `paymentExpiry` igualado a esa vigencia? ¿O se mantiene la cita apartada 24 h?
2. ¿El negocio puede reenviar el link desde el panel en el Sprint 2, o queda como deseable?
