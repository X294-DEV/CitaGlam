# Creación por Customer y términos — #33

## Horarios futuros — #48

La disponibilidad solo ofrece inicios posteriores al instante actual del servidor. La fecha solicitada sigue siendo calendario local de la sucursal y los rangos conservan sus instantes con zona. No se agrega un margen mínimo de anticipación. POST del panel, POST público y PATCH de reprogramación responden 409 con un mensaje explícito si el inicio ya pasó; se revalida junto a la escritura. No se cambian ni eliminan citas históricas.

Prueba real en PostgreSQL y API locales, con base temporal ficticia: `node --env-file=.env --test apps/cgbg-backend/test/future-booking.security.cjs`. Comprueba hoy/ayer/mañana en México y Tokio, errores 409 sin cambios persistidos y reservas futuras 201.

Integrar #30, #31 y #32 antes de este cambio. El PR de #33 incluye sus commits como dependencias explícitas para poder probar la combinación; todos los PR apuntan a main y no se reescribe historial.

La migración agrega Appointment.termsAcceptedAt nullable Timestamptz(3), sin fabricar aceptación para datos históricos. POST /appointments exige JWT, ADMIN/STAFF y tenant y recibe customerId. Customer, sucursal y servicio se consultan dentro del tenant del JWT. Citas capturadas por personal guardan termsAcceptedAt null y rechazan información/aceptación embebida de cliente.

POST /appointments/public recibe slug, branchId, serviceId, startTime ISO con zona, clientInfo (nombre, apellido, correo y teléfono internacional) y termsAccepted true a nivel de cita. El servidor valida negocio activo y pertenencia; resuelve/crea Customer por teléfono dentro de ese negocio sin modificar sus datos ni crear User. Customer nuevo, cita, pago y timestamp del servidor se guardan en una transacción. Un conflicto revierte todo; el reloj del navegador no se acepta como evidencia.

Las respuestas del panel, listados, mutaciones y detalle de clientes se serializan al AppointmentDto publicado. La confirmación pública usa solo PublicAppointmentResponse: sin customerId, tenantId, datos de contacto, tokens ni referencias de comprobantes. El vínculo interno User/Customer se usa exclusivamente para /appointments/mine autenticado, siempre limitado también al tenant del JWT; sin tenant se responde 403.

Desplegar coordinadamente con #35/#36: el formulario antiguo que envía términos dentro de clientInfo y el panel que envía datos embebidos ya no son válidos. Se conservan los límites de peticiones existentes. Captcha sigue en #37. paymentExpiry conserva temporalmente 24 h hasta integrar PaymentLink/vigencia acordada de Sprint 2; este issue no modifica cola, worker ni comprobantes.

Comprobación integrada aislada (cada caso crea y elimina únicamente su base ficticia):

```powershell
node --env-file=.env --test --test-concurrency=1 apps/cgbg-backend/test/customer.security.cjs apps/cgbg-backend/test/timezone.security.cjs apps/cgbg-backend/test/duration.security.cjs apps/cgbg-backend/test/booking-customer.security.cjs apps/cgbg-backend/test/booking-regressions.security.cjs
```

Los scripts de regresión de citas del Sprint 0 se adaptaron a Customer/instantes reales. El fixture de receipts-files.security.cjs, de pareja 2, todavía crea citas por clientId de User y requiere su actualización al nuevo esquema; no se modificó desde este issue. El servicio de comprobantes operativo no usa esa relación antigua.
