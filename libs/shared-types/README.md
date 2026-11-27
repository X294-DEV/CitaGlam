# Contrato de integración del Sprint 1

Publicado por pareja 1 el **19 de noviembre de 2026** para [#34](https://github.com/X294-DEV/CitaGlam/issues/34). Decisiones: [respuestas del PR #23](https://github.com/X294-DEV/CitaGlam/pull/23#issuecomment-6987889449).

**Contrato objetivo para implementar #30–#33. Publicarlo no activa endpoints ni migraciones.** Panel (#35) y cliente (#36) pueden preparar tipos y mocks; cambiarán las llamadas junto con la implementación del backend. Este paquete no modifica Prisma ni la base.

## Importación y comprobación

Paquete de workspace sin dependencias de Nest, Prisma, Angular o React. Solo tipos; usar `import type`:

```ts
import type {
  CustomerDto, AppointmentDto, CreateAppointmentRequest,
  CreatePublicAppointmentRequest, AvailabilityResponse, BranchDto,
} from '@cgbg/shared-types';
```

La raíz ya incluye `libs/*` en workspaces. `npm ci` enlaza `node_modules/@cgbg/shared-types`; no requiere generar JS ni copiar interfaces. Angular y Next resuelven el export `types` con `moduleResolution: bundler`; el backend ya tiene alias de TypeScript a `libs/shared-types/src/index`.

`npm run build --workspace libs/shared-types` comprueba tipos y ejemplos sin emitir builds. [examples/contract.examples.ts](examples/contract.examples.ts) contiene solicitudes y respuestas completas ficticias con `satisfies`. Las interfaces no sustituyen validaciones HTTP: los alias de fecha, teléfono, ID y dinero siguen siendo cadenas y deben validarse en ejecución.

`npm run check:consumers --workspace libs/shared-types` verifica imports desde ubicaciones virtuales en ambas apps con sus opciones y compiladores TypeScript reales, sin editar archivos de las apps. Es una comprobación del paquete y su resolución de tipos, no un build completo de los frontends ni una adaptación de sus pantallas.

## Campos obligatorios y valores nulos

| Pieza | Definición |
| --- | --- |
| CustomerInput | firstName, lastName, email y phone: cadenas obligatorias no vacías; email válido. Sin birthday, roles, contraseñas, tenant enviado ni consentimiento permanente. |
| phone | Internacional normalizado con `+` y código de país; mismo valor canónico para búsqueda y unicidad dentro del tenant. No inferir país del navegador. Ejemplo ficticio: `+525500000001`. |
| CustomerDto | Datos anteriores más id, createdAt y updatedAt (ISO con zona). Nunca una entidad User. |
| CustomerListItem | Customer más métricas existentes: totalSpent numérico, appointmentsCount y lastVisit ISO o null. lastVisit conserva la fecha de la cita más reciente reportada; no afirma que esté completada. |
| CustomerDetail | Elemento anterior más appointments: AppointmentDto[], filtradas al tenant del JWT. |
| BranchDto | id, name, address, city nullable, phone nullable y timezone IANA obligatorio. Subconjunto común, no entidad completa. |
| AppointmentDto | customerId/customer sustituyen clientId/client. Incluye inicio/fin reales, estado, sucursal con zona, servicio, pago y termsAcceptedAt. Campos exactos en src/index.ts. |
| Dinero | service.price y payment.amount: cadena decimal como Prisma Decimal, no float binario. Las métricas existentes conservan su tipo numérico. |
| Opcionales/nulos | Omitir notes/reason de solicitudes si no se usan. Las propiedades nullable de respuestas siempre están presentes con null, no cadena vacía. |

Se mantienen las rutas `/clients`; no se agregan endpoints nuevos de Customer. Usuarios con sesión y personal STAFF son contratos distintos.

## Rutas objetivo

### Catálogo público implementado en #40

Estas dos respuestas ya se seleccionan explícitamente en el backend de este cambio, independientemente de las migraciones de #30–#33:

- `GET /tenants/config/:slug` devuelve `PublicTenantDto`: id, name, slug, logoUrl nullable y config nullable. Config solo incluye primaryColor, secondaryColor nullable, welcomeMessage nullable y businessCategory nullable. No devuelve customSettings, IDs de configuración, suscripción, usuarios ni datos internos.
- `GET /tenants/public/:slug/services` devuelve `PublicServiceDto[]`, solo servicios activos del negocio activo. Incluye id, name, description nullable, durationMin, price como cadena decimal, imageUrl nullable, color nullable y category nullable. Categoría solo contiene id, name y order; sin tenantId, isActive ni timestamps internos. Una lista vacía es `[]`.
- Slug inexistente o negocio inactivo: 404. El slug se normaliza a minúsculas como antes. Los ejemplos tipados publicTenant/publicServices están en examples/contract.examples.ts.
- Pareja 4 adopta ambos tipos en #36, incluido `ThemeInjector` y los props de `BookingForm`; no debe copiar interfaces. El paquete permite importar `PublicTenantDto` y `PublicServiceDto` desde `@cgbg/shared-types`.

| Método y ruta existente | Entrada | Respuesta/acceso |
| --- | --- | --- |
| GET /clients | Sin tenant enviado | CustomerListItem[], 200; JWT + ADMIN/STAFF + tenant. |
| GET /clients/:id | ID de Customer | CustomerDetail, 200; cliente ajeno/inexistente: 404. |
| POST /clients | CreateCustomerRequest | CustomerDto, 201; teléfono duplicado dentro del tenant: 409. |
| POST /appointments | CreateAppointmentRequest | AppointmentDto, 201; JWT + ADMIN/STAFF + tenant. Cliente nuevo se crea primero en /clients. |
| POST /appointments/public | CreatePublicAppointmentRequest | PublicAppointmentResponse, 201; público con validación y límite de peticiones. |
| GET /appointments/merchant y /pending-approval | Sin tenant enviado | AppointmentDto[], 200; JWT/roles/tenant. |
| PATCH /appointments/:id/reschedule | RescheduleAppointmentRequest | AppointmentDto, 200; solo PENDING_PAYMENT, WAITING_APPROVAL o AUTHORIZED. |
| GET /appointments/available | Query AvailabilityRequest | AvailabilityResponse, 200. Sin huecos: []. |
| GET /tenants/public/:slug/branches | Slug público | BranchDto[], 200, incluyendo timezone. Las lecturas del panel también exponen timezone. |

Las mutaciones de estado de citas existentes conservan rutas y reglas y devolverán el mismo AppointmentDto del panel. El estado autorizado sigue llamándose AUTHORIZED, no CONFIRMED.

## Creación desde panel

```json
{
  "customerId": "11111111-1111-4111-8111-111111111111",
  "branchId": "22222222-2222-4222-8222-222222222222",
  "serviceId": "33333333-3333-4333-8333-333333333333",
  "startTime": "2026-11-20T16:00:00.000Z"
}
```

Tenant exclusivamente del JWT. Customer, sucursal y servicio deben ser del mismo tenant; referencia ajena: 404. Rechazar tenantId, clientInfo, termsAccepted, termsAcceptedAt y endTime en este cuerpo. El servidor calcula el fin con durationMin; el personal no puede atribuir aceptación al cliente.

## Reserva pública

```json
{
  "slug": "negocio-ejemplo",
  "branchId": "22222222-2222-4222-8222-222222222222",
  "serviceId": "33333333-3333-4333-8333-333333333333",
  "startTime": "2026-11-20T16:00:00.000Z",
  "clientInfo": {
    "firstName": "Ana", "lastName": "Ejemplo",
    "email": "ana@example.test", "phone": "+525500000001"
  },
  "termsAccepted": true
}
```

Se conserva clientInfo para los datos embebidos; la aceptación pasa al nivel de la cita. slug selecciona el negocio; el servidor verifica que sucursal/servicio le pertenezcan. Rechazar tenantId y customerId públicos. Resolver/crear Customer por teléfono dentro del tenant, nunca por email global sobre User. Encontrar un teléfono no autoriza sobrescribir los datos del Customer existente. No devolver su identidad almacenada.

La aceptación pública exige el booleano literal true y guarda termsAcceptedAt con el reloj del servidor dentro de la creación de la cita. No se acepta una fecha enviada por el navegador. Captura por personal: termsAcceptedAt null. Datos históricos sin evidencia: null; no fabricar aceptaciones retroactivas.

Confirmación pública mínima:

```json
{
  "id": "44444444-4444-4444-8444-444444444444",
  "startTime": "2026-11-20T16:00:00.000Z",
  "endTime": "2026-11-20T17:30:00.000Z",
  "status": "PENDING_PAYMENT",
  "paymentExpiry": "2026-11-20T15:00:00.000Z",
  "branch": { "name": "Sucursal de ejemplo", "address": "Dirección ficticia", "timezone": "America/Mexico_City" },
  "service": { "name": "Servicio de ejemplo", "durationMin": 90, "price": "350.00" },
  "payment": { "amount": "350.00" }
}
```

Sin tenantId, customerId, nombres/email/teléfono de Customer, tokens ni ruta de comprobante. paymentExpiry es el vencimiento real calculado por el backend, no desde startTime, o null si no aplica. El ejemplo supone una reserva realizada antes de ese vencimiento. Los 60 minutos y PaymentLink se implementan en Sprint 2; no se activan por publicar este contrato.

## Disponibilidad, fecha y reprogramación

Query: `branchId`, `serviceId` y `date=2026-11-20`. date es fecha pura YYYY-MM-DD en Branch.timezone, no T12:00Z. El servidor calcula rangos por durationMin y ocupación real. Respuesta:

```json
[
  { "startTime": "2026-11-20T16:00:00.000Z", "endTime": "2026-11-20T17:30:00.000Z" },
  { "startTime": "2026-11-20T18:00:00.000Z", "endTime": "2026-11-20T19:30:00.000Z" }
]
```

El primer rango es **10:00–11:30 en America/Mexico_City**. `2026-11-20T10:00:00-06:00` y `2026-11-20T16:00:00.000Z` son el mismo instante. Guardar Timestamptz; aceptar solicitudes ISO con Z u offset y devolver UTC/Z. Rechazar instantes sin zona. Mostrar con timezone de la sucursal y reenviar startTime del rango tal cual: sin añadir Z a una hora local ni redondear minutos a 00.

Reprogramación:

```json
{ "newStartTime": "2026-11-20T18:00:00.000Z", "reason": "Solicitud del cliente" }
```

El servidor recalcula endTime. Una ocupación concurrente puede producir 409 aunque el rango se hubiera mostrado libre. Se excluye la propia cita al guardar la reprogramación.

Para poblar el selector del panel, `AvailabilityRequest` admite `excludeAppointmentId` opcional (#53). Enviar `Authorization: Bearer <JWT>` de ADMIN/STAFF: solo se excluye una cita existente del tenant tomado del JWT y de la sucursal consultada. Ejemplo: `GET /appointments/available?branchId=…&serviceId=…&date=2026-11-20&excludeAppointmentId=…`. Una cita ajena, de otra sucursal o inexistente se ignora y devuelve los mismos rangos normales, sin indicar si existe. No permite ignorar otras ocupaciones ni desactiva la restricción SQL al guardar.

La ruta sigue siendo pública sin JWT: sin sesión, con rol distinto o sin tenant, el parámetro no excluye ocupaciones. Un Authorization enviado pero inválido/vencido devuelve 401. Los IDs deben ser UUID y la fecha calendario válida; query inválida devuelve 400. Sin el parámetro, se conserva el cálculo habitual. Se conserva el límite global existente de 300 peticiones por IP/minuto (`ThrottlerGuard` global); no se agrega otro umbral. Pareja 3 debe enviar el ID de la cita al cargar horarios para reprogramar; pareja 4 no necesita cambios.

## Errores y privacidad

ApiErrorResponse: statusCode numérico, message como cadena o array, error opcional. Decidir por HTTP/statusCode, no comparar textos traducibles.

| HTTP | Caso |
| --- | --- |
| 400 | Campos faltantes/desconocidos, términos públicos distintos de true, fecha sin zona, date inválida o estado no reprogramable. |
| 401 | JWT ausente/inválido/vencido en rutas del panel. |
| 403 | Rol no permitido o usuario sin tenant. |
| 404 | Customer/servicio/sucursal/cita inexistente o de otro negocio, sin distinguir ambos. |
| 409 | Horario ocupado, incluida concurrencia, o teléfono duplicado en alta manual del tenant. |
| 429 | Límite alcanzado; mostrar mensaje de reintento sin bucle automático. |

```json
{ "statusCode": 409, "message": "El horario seleccionado ya no está disponible.", "error": "Conflict" }
```

```json
{ "statusCode": 400, "message": "Debe aceptar los términos para reservar.", "error": "Bad Request" }
```

```json
{ "statusCode": 404, "message": "Cliente no encontrado.", "error": "Not Found" }
```

No exponer User ni secretos. Consultas del panel con tenant del JWT; públicas verifican negocio/sucursal/servicio. payment.receiptUrl es referencia interna del panel, no URL pública: descargar con JWT en la ruta existente GET /receipts/:appointmentId/file, nunca /uploads/receipts.

## Adopción y límites

1. Este paquete permite preparar tipos/mocks del panel #35 y cliente #36. Los frontends cambian sus llamadas junto con los PR que implementen #30–#33.
2. Cambios: client/clientId → customer/customerId; HH:00 → rangos; fecha artificial UTC → instantes reales; términos embebidos en cliente → aceptación de la cita.
3. El mapeo de User CLIENT autenticado y GET /appointments/mine no se redefine aquí. No reutilizar customerId como prueba de identidad; la migración de #30/#33 debe resolver su autorización antes de exponer datos.
4. CAPTCHA (#37), cadencia de generación de intervalos, edición de datos por una reserva anónima y contratos de pago/comprobantes quedan en sus issues. Los frontends no deben deducir huecos ni cadencia.
5. Publicar el contrato cumple la entrega escrita del 19-nov; no afirma implementación ni pruebas HTTP de endpoints futuros. Hasta su despliegue coordinado se conserva el comportamiento actual del Sprint 0.
