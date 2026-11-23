# Prisma Documentation

## Migración Customer (#30)

Política confirmada por Aioria el 23-nov-2026: User CLIENT sin negocio ni citas se conserva sin Customer. Se migra un Customer por cada tenant del usuario o de sus citas, conservando citas, User, Profile y credenciales. userId en Customer es un vínculo interno para cuentas existentes; no se recibe en altas públicas/manuales ni se infiere por email.

La migración `20261123093000_customer_per_tenant` es transaccional. Valida nombre/apellido/correo y teléfono internacional normalizado (quita espacios, paréntesis, puntos y guiones, sin inferir país). Rechaza teléfonos duplicados dentro de un tenant y citas de usuarios con rol distinto de CLIENT. Ante datos incompletos/ambiguos revierte: corregirlos con el humano y respaldo antes de reintentar; no inventar teléfonos ni fusionar clientes automáticamente.

Con aplicaciones detenidas y DATABASE_URL del entorno correcto: `npx prisma migrate deploy --schema=libs/prisma/prisma/schema.prisma`, después generar Prisma, compilar y arrancar el backend nuevo. Si Prisma registró una migración fallida cuya transacción se revirtió, revisar error/datos antes de `prisma migrate resolve --rolled-back 20261123093000_customer_per_tenant` y reintentar. Nunca borrar volúmenes.

Las citas pasan de clientId/User a customerId/Customer. /clients filtra por tenant del JWT y select explícito. /appointments/mine exige tenant y busca Customer del tenant del JWT vinculados al User autenticado; no acepta customerId como identidad. La reserva pública deja de crear/modificar User, resuelve por teléfono del tenant sin sobrescribir Customer existente. Los cuerpos definitivos panel/público y términos son #33; horas y duración son #31/#32.

Prueba con datos anteriores y API real: `node --env-file=.env --test apps/cgbg-backend/test/customer.security.cjs`. Crea y elimina únicamente su base temporal ficticia; nunca la base configurada ni volúmenes.
