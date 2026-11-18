# 0002 — Impacto del Sprint 1 en el panel Angular (`apps/cgbg-admin`)

- **Estado:** propuesta, pendiente de revisión de la pareja 1
- **Autora:** pareja 3 (Marjorie) — issue S0-08
- **Fecha:** 12 de noviembre de 2026

## Contexto

En el Sprint 1 cambian tres cosas que el panel consume (ver `AGENTS.md`, "Decisiones vigentes y planeadas"):

1. Los clientes dejan de ser `User` con rol `CLIENT` y pasan al modelo `Customer` por tenant.
2. Las citas usan la duración real (`durationMin`) en lugar de bloques de 1 hora.
3. Las horas pasan a `Timestamptz` con zona horaria por sucursal.

Este documento lista qué partes del panel se verán afectadas. Todas las rutas son relativas a `apps/cgbg-admin/src/app/`. Las líneas se verificaron leyendo los archivos el 12-nov-2026 sobre `main` en `0866949` (los cambios posteriores en `main` no tocan el código de `apps/cgbg-admin`; solo el `.editorconfig` del PR de S0-07).

> Alcance: solo el panel. No se revisó backend, `apps/cgbg-client` ni la lógica de disponibilidad del servidor. No se inventan campos: los nombres del contrato futuro deben salir de la pareja 1.

## Hallazgos generales

- **El panel no usa `libs/shared-types`.** No hay ningún import de `shared-types` ni alias `@cgbg` en `apps/cgbg-admin`; los tipos son locales (`core/services/appointment.service.ts`, `core/services/client.service.ts`). Además `libs/shared-types` solo contiene un `README.md`, sin código. Hoy el compilador no puede avisar de un cambio de contrato.
- **`Appointment.endTime` no se usa en ninguna pantalla.** Solo existe en la interfaz (`core/services/appointment.service.ts:14`). El panel nunca calcula ni muestra la hora de fin. (Las excepciones de horario de sucursal tienen campos con el mismo nombre, `core/services/branch.service.ts:20-21`, pero son otra cosa.)
- **`durationMin` del servicio solo se muestra y edita** (`features/services/services-list/services-list.component.html:61,101`; `features/services/service-form/service-form.component.ts:38,51,69`). Ningún cálculo de agenda lo usa.
- **El panel mezcla UTC y hora local.** Calendario, modal y lista de citas interpretan la hora como UTC; el detalle de cliente usa el `DatePipe` sin zona, es decir, hora local del navegador. Un navegador en UTC-6 ve horas distintas en pantallas distintas.
- **Reprogramar está a medias.** Existe en la lista de citas (con `window.prompt`). En el modal del calendario no se puede alcanzar: `save()` sale antes con `if (this.isEdit()) return;` (`features/calendar/appointment-modal/appointment-modal.component.ts:115`) y la rama de reprogramar de las líneas 143-144 está vacía.

## 1. Datos de cliente (`firstName`, `lastName`, `email`, `phone`)

| Archivo:línea | Qué usa | Cambio esperado con `Customer` |
| --- | --- | --- |
| `core/services/client.service.ts:8-11` | Interfaz `Client` (`firstName`, `lastName`, `email`, `phone?`) | Reemplazar por tipo compartido de `Customer` |
| `core/services/client.service.ts:14-15` | `lastVisit?`, `appointments?: Appointment[]` | Revisar contra el contrato nuevo |
| `core/services/client.service.ts:36,44` | `GET` y `POST` de `/clients` | Puede cambiar el endpoint o el cuerpo |
| `core/services/appointment.service.ts:17-20` | `Appointment.client?` con `firstName`, `lastName`, `email` (sin `phone`) | Pasa a `customer`; decidir si `email` sigue siendo obligatorio |
| `core/services/appointment.service.ts:68` | `create(dto: any)` | Tipar con un DTO compartido |
| `features/clients/clients-list/clients-list.component.ts:26-32` | Filtro por `firstName`, `lastName`, `email` | Si `email` pasa a ser opcional, `c.email.toLowerCase()` (línea 32) rompe |
| `features/clients/clients-list/clients-list.component.ts:59-62` | `phone` a enlace `wa.me` | Con `@@unique([tenantId, phone])` el teléfono es la llave: conviene normalizarlo |
| `features/clients/clients-list/clients-list.component.html:37` | Iniciales `client.firstName[0]`, `client.lastName[0]` | Falla si `lastName` viene vacío |
| `features/clients/clients-list/clients-list.component.html:47,69` | `client.phone`, `client.lastVisit` | Revisar |
| `features/clients/client-modal/client-modal.component.ts:26,49` | Formulario y `create(this.clientForm.value)` | Cambia el cuerpo del `POST` |
| `features/clients/client-modal/client-modal.component.html:47` | Campo `birthday` | No existe en la interfaz `Client`: decidir si el contrato lo incluye |
| `features/clients/client-detail/client-detail.component.html:15-17,26,29-33,37-38` | Iniciales, nombre, `email`, `phone`, WhatsApp | Misma observación de `email` y `lastName` opcionales |
| `features/appointments/appointments-list/appointments-list.component.html:35-36,95,199-200` | `appointment.client?.firstName/lastName/email` | Pasa a `customer` |
| `features/calendar/calendar.component.html:71` | `app.client?.firstName` y `lastName` | Pasa a `customer` |
| `features/calendar/appointment-modal/appointment-modal.component.ts:42,45` | Controles `clientEmail`, `clientPhone` | Ver cuerpo de creación abajo |
| `features/calendar/appointment-modal/appointment-modal.component.ts:96-98` | Rellena el formulario desde `appointment.client` | Pasa a `customer` |
| `features/calendar/appointment-modal/appointment-modal.component.ts:134-139` | Envía `clientInfo { email, firstName, lastName, phone }` y `termsAccepted: true` fijo en `POST /appointments` | **Contrato más sensible**: el cuerpo de creación cambia. `termsAccepted` es un dato legal: ver pregunta 7 |

Pantallas (rutas en `app.routes.ts:41-46`): `/admin/calendar`, `/admin/appointments`, `/admin/clients`, `/admin/clients/:id`. El dashboard solo agrega métricas (`newClients`, `features/dashboard/dashboard.component.html:52`) y no usa datos personales del cliente.

Fuera de alcance, aunque también usan `firstName`/`lastName`/`email`/`phone`, porque **no** son clientes finales: personal STAFF (`features/staff/staff-list/staff-list.component.ts:28-32,188-190`, `core/services/staff.service.ts:8-19`), prospectos y negocios del superadmin (`features/admin-global/saas-requests/*`, `features/admin-global/saas-tenants/*`) y el usuario con sesión (`core/services/auth.service.ts:8-10`).

## 2. Bloque de 1 hora y conversión de hora

### Asume bloque de 1 hora (`HH:00`)

| Archivo:línea | Qué hace |
| --- | --- |
| `features/calendar/calendar.component.ts:35` | Rejilla de 14 horas (8 a 21), una fila por hora |
| `features/calendar/calendar.component.ts:101-103` | `formatAppointmentHour` devuelve `getUTCHours()` + `':00'` |
| `features/calendar/calendar.component.ts:132-135` | Coloca la cita en la fila de su hora de inicio; una cita de 90 min no ocupa dos filas |
| `features/calendar/calendar.component.ts:146` | "Nueva cita" fija `hour: 9` |
| `features/calendar/calendar.component.html:48-49,59` | Etiquetas `{{ hour }}:00` y celdas por hora |
| `features/calendar/calendar.component.html:110` | La vista de mes fija la hora en 9 (`onCellClick(day.date, 9)`) |
| `features/calendar/appointment-modal/appointment-modal.component.ts:94,104` | Construyen la hora con `':00'` al editar y al crear |
| `features/calendar/appointment-modal/appointment-modal.component.html:75` | Etiqueta "Hora (HH:00)" |
| `features/business-settings/business-settings.component.html:82,84,97,99` | Horario de sucursal con `<input type="time" step="1800">`: ya permite 09:30, mientras calendario y modal solo aceptan `HH:00`. Inconsistencia que existe hoy |
| `features/calendar/appointment-modal/appointment-modal.component.html:78-79` | Selector con 8..21 y valor `HH:00` |
| `features/calendar/appointment-modal/appointment-modal.component.ts:126-127` | Comentario "assumes HH:00 per plan" y construcción de la hora |
| `features/appointments/appointments-list/appointments-list.component.ts:145,148` | Reprogramar pide la hora con formato `HH:00` |
| `features/clients/client-detail/client-detail.component.html:90` | `date: 'HH:00'` (siempre muestra minutos en 00) |

### Convierte o interpreta la hora

| Archivo:línea | Interpretación | Nota |
| --- | --- | --- |
| `features/calendar/calendar.component.ts:97-98` | UTC (`toISOString().slice(0, 10)`) | La clave de día es UTC |
| `features/calendar/calendar.component.ts:103,135` | UTC (`getUTCHours`) | |
| `features/calendar/calendar.component.ts:141-142` | UTC (clave de día) en la vista de día | |
| `features/calendar/appointment-modal/appointment-modal.component.ts:89,93` | UTC al editar | |
| `features/calendar/appointment-modal/appointment-modal.component.ts:127` | Sufijo `Z` literal | Hora local capturada se envía como si fuera UTC (coincide con la decisión vigente de `AGENTS.md`) |
| `features/appointments/appointments-list/appointments-list.component.ts:144-145,157` | UTC | `newStartTime` con `Z` literal |
| `features/appointments/appointments-list/appointments-list.component.ts:218-222` | `formatDateTime` con zona UTC, 24 h | Lo usan `appointments-list.component.html:43,104,197` |
| `features/clients/client-detail/client-detail.component.html:78,90` | **Hora local del navegador** (`DatePipe` sin zona) | Inconsistente con el resto |

Riesgo de borde: en las vistas de semana y mes los días salen de `date-fns` a medianoche local (en UTC-6 son las 06:00Z del mismo día) y no se corren. El fallo está en la vista de día y en "Nueva cita", que usan `currentDate()` con la hora actual: en un navegador en UTC-6, a partir de las 18:00 locales `toUtcDateKey` (`features/calendar/calendar.component.ts:135,141`) y el modal (`appointment-modal.component.ts:101`) toman el día siguiente, y la vista de día muestra las citas de mañana. (Razonamiento sobre el código; no se reprodujo en el navegador.)

### Calendario y reprogramación

- **Calendario:** `features/calendar/calendar.component.ts` más su plantilla y el modal. Es la pantalla con más cambios, porque la rejilla por hora tiene que pasar a posicionar por minutos y duración.
- **Reprogramación en la lista:** `appointments-list.component.ts:143-158` usa `window.prompt` para fecha y hora, sin validar formato, disponibilidad ni duración. Botones en `appointments-list.component.html:168,237`. Servicio: `core/services/appointment.service.ts:80-81` (`PATCH /{id}/reschedule`).
- **Reprogramación en el modal:** `appointment-modal.component.ts:143-144` está vacía ("Logic for reschedule...").
- **Disponibilidad:** `core/services/appointment.service.ts:92-93` (`getAvailability`) existe pero el calendario no la llama; `availableSlots` (`appointment-modal.component.ts:33`) nunca se llena.
- **Zona horaria por sucursal:** hoy no existe ningún campo de zona horaria por tenant ni por sucursal en el panel: `Branch` (`core/services/branch.service.ts:24-30`) no lo tiene. El único `timezone` es la configuración global del SaaS, de superadmin (`features/admin-global/saas-config/saas-config.component.ts:60,976,1131,1299`, por defecto `America/Mexico_City`), y ninguna pantalla de citas lo consume.

## 3. Tipos propuestos para `libs/shared-types`

Hoy la librería está vacía. Propuesta mínima, que la pareja 1 debe confirmar antes de escribirla (los campos exactos salen del esquema Prisma, que es solo de ellos):

1. `CustomerDto` — lo que hoy es `Client`.
2. `AppointmentDto` — con `startTime`, `endTime` y el cliente como `CustomerDto`; fija si las horas viajan como ISO con zona.
3. `CreateAppointmentRequest` — reemplaza el `any` de `create` y el objeto `clientInfo`.
4. `RescheduleAppointmentRequest` — reemplaza el `any` de `reschedule` (hoy `newStartTime`, `reason`).
5. `AvailabilityResponse` — hoy `string[]` de horas; su forma con duración real se decide en la pregunta 4.
6. `BranchDto` con su zona horaria.

Con esto, `ng build` falla en cada pantalla afectada cuando el contrato cambie, en lugar de fallar en ejecución. Requiere que `apps/cgbg-admin` consuma la librería (alias en `tsconfig`); ese ajuste de configuración es del panel.

## 4. Esfuerzo estimado por pantalla

| Pantalla / pieza | Talla | Motivo |
| --- | --- | --- |
| Calendario (`features/calendar/calendar.component.*`) | **L** | Rejilla por hora a posición por minuto y duración, claves de día en zona de la sucursal |
| Modal de cita (`appointment-modal.*`) | **L** | Cuerpo de creación nuevo, disponibilidad real, rama de reprogramar vacía, zona horaria |
| Lista de citas y reprogramar (`appointments-list.*`) | **M** | Reemplazar `prompt` por selector con disponibilidad; `formatDateTime` con zona de sucursal |
| Servicios `appointment.service.ts` / `client.service.ts` | **M** | Cambiar tipos a los compartidos y tipar `create` y `reschedule` |
| Detalle de cliente (`client-detail.*`) | **S** | Quitar `HH:00`, unificar zona, campos opcionales |
| Lista de clientes (`clients-list.*`) | **S** | Filtro, iniciales y teléfono como llave |
| Modal de cliente (`client-modal.*`) | **S** | Nuevo cuerpo; decidir `birthday` |
| Configuración del negocio (`features/business-settings/*`, ruta `/admin/settings`, `app.routes.ts:47`) | **M** | Horario con pasos de 30 min, excepciones de sucursal y lugar natural para la zona horaria por sucursal (hoy `Branch` no la tiene) |
| Dashboard | **S** | Solo agregados; revisar `newClients` si cambia la métrica |
| Servicios (`services-list`, `service-form`) | **S** | Solo mostrar y editar `durationMin`; sin cambio previsto |

Total aproximado: 2 pantallas L, 3 piezas M y el resto S. El calendario y el modal conviene hacerlos juntos y en cuanto la pareja 1 publique el contrato.

## 5. Preguntas abiertas para la pareja 1

1. ¿`Customer.email` será obligatorio u opcional? ¿Y `lastName`?
2. ¿El cuerpo de `POST /appointments` seguirá aceptando datos de cliente embebidos o recibirá un `customerId`?
3. ¿Las horas viajarán como ISO con zona (`Timestamptz`) y la sucursal expondrá su `timezone`?
4. ¿`GET /appointments/available` devolverá horas de inicio o rangos con duración?
5. ¿`birthday` entra en `Customer`?
6. ¿En qué fecha publicarán el contrato para que el panel lo consuma el mismo día?
7. ¿`termsAccepted` (hoy fijo en `true` desde el panel) sigue existiendo en `Customer` o en la cita? ¿Quién lo registra y con qué fecha?

## Pendiente fuera de este documento

- `libs/shared-types/README.md` está guardado en UTF-16 (no UTF-8); es candidato para el issue S0-07. No es un `.ts` ni `.html`, por eso el `grep` del issue no lo detecta.
