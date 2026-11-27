# Token de pago en PostgreSQL — #56

`PrismaModule` exporta `PaymentLinkService` desde `@cgbg/prisma` para API y worker. Vigencia acordada: 60 minutos desde la captura de la cita. Las nuevas citas guardan ese vencimiento en `paymentExpiry`. No se cambian datos históricos al migrar ni se importan tokens de Redis.

- `create(appointmentId, tenantId)` verifica la cita PENDING_PAYMENT dentro del negocio, genera 32 bytes criptográficos como base64url y devuelve `{ token, appointmentId, expiresAt }`. El tenant debe proceder del JWT en un flujo del panel o del trabajo interno validado del worker. No crear una ruta pública para emitir tokens.
- Solo se guarda SHA-256 como `PaymentLink.tokenHash`, con índice único, relación a cita y fechas Timestamptz. El hash no se devuelve. El token en claro no se persiste ni se registra en logs; el resultado de `create` solo debe usarse para armar y enviar el enlace.
- `validate(token)` devuelve `{ appointmentId, expiresAt }` para mostrar el formulario sin consumirlo. Requiere token vigente sin uso, cita PENDING_PAYMENT y paymentExpiry vigente.
- `consume(token, tx?)` devuelve `{ appointmentId }`. Actualiza usedAt condicionalmente en una sola operación: dos usos simultáneos del mismo token solo permiten uno. Usado, vencido, inventado, cita cancelada o pago vencido devuelven el mismo 404: «El enlace de comprobante no está disponible o expiró».

Para #57, validar primero el archivo y usar `consume(token, tx)` **dentro de la misma transacción** que cambia la cita a WAITING_APPROVAL y guarda el comprobante. Verificar también que la actualización de la cita siga siendo condicional a PENDING_PAYMENT. Si falla la persistencia, la transacción revierte usedAt; limpiar cualquier archivo recién creado si la transacción falla. No devolver PaymentLink ni sus campos desde receipts. La respuesta pública conserva el subconjunto mínimo.

La emisión bloquea la fila de cita y nunca prolonga el vencimiento existente: `expiresAt = min(paymentExpiry, ahora + 60 min)`, o ahora + 60 min si antes era null. Al emitir para una cita antigua todavía vigente, ajusta paymentExpiry al mismo instante. No ofrece un flujo de reenvío ni reemplazo; la idempotencia del trabajo y la entrega única del enlace corresponden a #57/#58. El secreto en claro no se puede recuperar del hash después de emitirlo.

## Integración pendiente de pareja 2

#56 entrega esquema y servicio. `receipts.service.ts` y el worker conservan temporalmente Redis y su flujo anterior hasta #57: aún no se afirma un flujo completo usando PostgreSQL. En #57 se deben sustituir esas llamadas, eliminar el log actual del enlace completo y usar el vencimiento devuelto por el servicio, sin sumar otras 24 horas. #58 envía el enlace por correo sin registrarlo. Desplegar coordinadamente.

## Verificación

`node --env-file=.env --test apps/cgbg-backend/test/payment-link.security.cjs`

Ejecuta la migración en una base limpia y en otra con una cita ficticia previa; prueba con PostgreSQL real el hash, la expiración, concurrencia, rollback, cita cancelada y errores uniformes. Incluye POST real autenticado y comprueba paymentExpiry de 60 minutos. Los fixtures crean y eliminan únicamente sus bases temporales locales; no alteran volúmenes ni datos de trabajo.
