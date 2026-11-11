# Handoff técnico — CitaGlam / CGBG

**Fecha:** 2026-09-08  
**Propósito:** transferir contexto operativo y técnico a otro LLM sin repetir cambios ni sobrescribir trabajo existente.

> Este archivo recoge trabajo realizado y comprobado durante sesiones anteriores. Algunos estados de ejecución y datos de prueba fueron verificados en julio de 2026: deben considerarse históricos hasta validarlos de nuevo. No contiene secretos; consultar los archivos `.env` locales para valores reales.

## 1. Proyecto y fuentes de verdad

Monorepo de reservas multi-tenant, inicialmente orientado a belleza:

- `apps/cgbg-backend`: API NestJS.
- `apps/cgbg-admin`: panel Angular para superadmin y tenant.
- `apps/cgbg-client`: One Page público Next.js.
- `apps/cgbg-worker`: NestJS worker para RabbitMQ, Redis y tareas de pago.
- `libs/prisma/prisma`: esquema, migraciones y acceso a PostgreSQL.
- `docs/`: especificación original, diagramas y prompts de implementación.

Documentación más relevante antes de cambiar código:

- `docs/00-guia-inicio/` — requisitos, infraestructura y variables.
- `docs/03-arquitectura/README.md` y `docs/04-tecnico/README.md` — arquitectura.
- `docs/06-diagramas/02-flujo-reserva-comprobante.md` — reserva, pago y comprobante.
- `docs/09-prompts/04-booking/` — reservas y disponibilidad.
- `docs/09-prompts/06-payments/` — RabbitMQ, link temporal, carga, aprobación y limpieza.
- `docs/09-prompts/09-ui-integration/02-booking-calendar-client.md` — integración cliente/calendario.

El árbol de trabajo se detectó como **no Git** en una sesión previa. No usar `git reset`, `git checkout --` ni asumir que cambios no versionados son descartables. Antes de editar, inspeccionar el archivo objetivo y preservar trabajo del usuario.

## 2. Entorno local conocido

Servicios Docker esperados:

| Servicio | Acceso local |
| --- | --- |
| Cliente público | `http://localhost:3000` |
| API backend | `http://localhost:3001` |
| Panel admin | `http://localhost:4200` |
| RabbitMQ management | `http://localhost:15672` |
| PostgreSQL | puerto `5433` |
| Redis | puerto `6379` |

El motor que funcionó fue Docker dentro de `Ubuntu-24.04` en WSL. Docker Desktop puede estar apagado aunque el comando `docker` de PowerShell exista. Patrón usado:

```powershell
wsl -d Ubuntu-24.04 -u root -- bash -lc "cd /mnt/c/Users/adria/Downloads/cgbg-main && docker compose ps"
```

Inicio robusto: levantar primero `cgbg-db`, `cgbg-redis`, `cgbg-mq`; esperar su salud; después `cgbg-backend`, `cgbg-client`, `cgbg-admin`, `cgbg-worker`. El backend puede tardar 60–90 segundos por `prisma generate`.

Riesgo operativo conocido: si el worker inicia antes de Redis/RabbitMQ, puede registrar `ECONNREFUSED` y no reintentar correctamente el consumidor RabbitMQ. Reiniciar solo el worker tras estabilizar infraestructura. En sesiones WSL largas, un proceso `nohup` de mantenimiento evitó que WSL se detuviera; no asumir que sigue vivo hoy.

El `docker-compose.yml` llegó a usar estos comandos relevantes:

- backend: genera Prisma y arranca `apps/cgbg-backend/src/main.ts` con `ts-node`.
- worker: directorio `/workspaces/cgbg/apps/cgbg-worker`, `npm run start:dev`.

## 3. Cambios realizados

### 3.1 Catálogo, negocio y rutas tenant

- Se corrigieron altas/actualizaciones de categorías y servicios del tenant. DTOs aceptan `isActive`.
- Se corrigió guardado de horarios de negocio: frontend usa `POST`; backend admite también alias `PUT` para compatibilidad.
- Se separó navegación de **Citas** hacia `/admin/appointments`; no debe redirigir al dashboard.
- Cambio de categoría de un servicio: formulario limpia payload antes de `PATCH`, convierte `price` y `durationMin` a número y normaliza `categoryId` a `null` o string.
- `CreateServiceDto` usa `@Type(() => Number)` para campos numéricos, evitando fallas de validación cuando llegan como texto.

Archivos confirmados:

- `apps/cgbg-admin/src/app/features/services/service-form/service-form.component.ts`
- `apps/cgbg-backend/src/services/dto/create-service.dto.ts`

### 3.2 Citas, pago y acciones administrativas

Se implementaron/repararon endpoints de citas del tenant:

```text
GET    /appointments/pending-approval
PATCH  /appointments/:id/approve
PATCH  /appointments/:id/reject
DELETE /appointments/:id
PATCH  /appointments/:id/status
```

Se añadió `apps/cgbg-backend/src/appointments/dto/update-appointment-status.dto.ts`, con `AppointmentStatus` validado y razón opcional.

Reglas aplicadas:

- Aprobar pago lleva cita a `AUTHORIZED`.
- Cancelar lleva a `CANCELLED`.
- Completar solo se permite desde `AUTHORIZED`.
- Reprogramar conserva estado actual; no fuerza `AUTHORIZED`.
- Cambios directos incompatibles se rechazan.

Panel de citas:

- Reemplazado botón aislado “Ver detalles” por menú `⋮`.
- Menú contiene detalles, reprogramar, cancelar, completar, aprobar/rechazar pago según estado y comprobante.
- Confirmar pago solo aparece cuando cita espera aprobación y contiene comprobante.
- Reprogramación solicita fecha `YYYY-MM-DD` y hora `HH:00`; envía fecha UTC `...:00.000Z`.
- Se corrigió badge de estado: regla global `td span` ya no afecta `.status-pill`; badge toma ancho de contenido y centra texto. Corrige `Cancelada` estirada/alineada a izquierda.

Archivos confirmados:

- `apps/cgbg-backend/src/appointments/appointments.controller.ts`
- `apps/cgbg-backend/src/appointments/appointments.service.ts`
- `apps/cgbg-backend/src/appointments/dto/update-appointment-status.dto.ts`
- `apps/cgbg-admin/src/app/core/services/appointment.service.ts`
- `apps/cgbg-admin/src/app/features/appointments/appointments-list/appointments-list.component.ts`
- `apps/cgbg-admin/src/app/features/appointments/appointments-list/appointments-list.component.html`
- `apps/cgbg-admin/src/app/features/appointments/appointments-list/appointments-list.component.css`

La cancelación desde detalle/calendario también quedó conectada a `appointmentService.cancel`; errores deben mostrarse en interfaz en lugar de fallar silenciosamente.

### 3.3 Calendario y zona horaria

Problemas corregidos:

- Botones Día/Semana/Mes antes solo cambiaban señal `view`; vista siempre era semanal.
- Hoy, anterior y siguiente no recalculaban rango visible.
- Crear cita desde modal podía fallar silenciosamente porque teléfono era opcional visualmente pero obligatorio en backend.
- Horas seleccionadas y horas renderizadas tenían desplazamiento por zona horaria.

Implementación:

- `calendar.component.ts` calcula `visibleDays` para día, semana y mes con `date-fns` (`startOfWeek`, `endOfWeek`, `startOfMonth`, `endOfMonth`, `addDays`, `addMonths`, `isSameDay`, `isSameMonth`).
- Etiqueta de fecha y navegación cambian según vista activa.
- HTML se reescribió en UTF-8: agenda adaptable para día/semana y grilla mensual de siete columnas.
- CSS incluye estilos de mes y scroll horizontal responsivo; no oculta días para aparentar que cambió vista.
- Filtrado/render usa claves UTC (`toUtcDateKey`) y horas UTC, consistente con reserva pública.
- Modal selecciona sucursal inicial, carga servicios activos y muestra el mensaje real de API. Envía `phone` solo si se capturó.
- Backend declara `phone?: string` con `@IsOptional()` en DTO de creación.

Archivos confirmados:

- `apps/cgbg-admin/src/app/features/calendar/calendar.component.ts`
- `apps/cgbg-admin/src/app/features/calendar/calendar.component.html`
- `apps/cgbg-admin/src/app/features/calendar/calendar.component.css`
- `apps/cgbg-admin/src/app/features/calendar/appointment-modal/appointment-modal.component.ts`
- `apps/cgbg-backend/src/appointments/dto/create-appointment.dto.ts`

Limitación aún vigente: selector de horas del modal no consume disponibilidad real por sucursal/servicio/fecha. El backend sí valida disponibilidad al crear; conectar `availableSlots` al selector sería mejora futura.

### 3.4 Login y verificación de correo repetida

Causa confirmada: backend validaba `user.isActive`, pero respuesta de login no incluía ese campo. Angular evaluaba `!undefined` como verdadero y enviaba a usuarios activos a verificación de email.

Corrección:

- `AuthService.login`, `completeExpressActivation` y `resetPassword` devuelven `isActive`.
- Login redirige a verificación solo cuando `res.user.isActive === false` y rol `ADMIN`.
- Pantalla de verificación vuelve al login/panel cuando `user.isActive !== false`.

Archivos confirmados:

- `apps/cgbg-backend/src/auth/auth.service.ts`
- `apps/cgbg-admin/src/app/features/auth/login/login.component.ts`
- `apps/cgbg-admin/src/app/features/auth/verify-email/verify-email.component.ts`

Se verificó en la base local que el admin de GlamRock tenía `isActive=true`, token de activación nulo y expiración nula. Evitar poner el correo personal/dato de demo en documentación pública.

## 4. Flujo de pago real implementado

| Paso | Componente | Resultado |
| --- | --- | --- |
| Reserva pública | Cliente + API | Cita `PENDING_PAYMENT`, expiración de pago a 24 h. |
| Evento | Backend | Emite `appointment.created`. |
| Link temporal | Worker | Guarda Redis `cgbg:payment:link:<uuid>` con ID de cita, TTL 86400 s. |
| Entrega actual | Worker | Imprime `http://localhost:3000/upload-receipt/<token>` en consola. |
| Carga | Cliente + API | `GET /receipts/validate/:token`; `POST /receipts/upload/:token`. |
| Estado | API | Guarda archivo y cambia cita a `WAITING_APPROVAL`; elimina token Redis. |
| Revisión | Tenant | Ve comprobante en Citas, aprueba o rechaza. |
| Aprobación | API | Cita `AUTHORIZED`, pago `isApproved=true`, fecha de aprobación. |

Restricciones de archivo: JPG, PNG o PDF; máximo 5 MB. Ubicación local: `apps/cgbg-backend/uploads/receipts`. La URL se sirve como `/uploads/receipts/<archivo>`.

El link temporal **no es** URL del comprobante. Es portal de carga. URL del comprobante existe solo después de subir archivo.

El worker cancela reservas vencidas en `PENDING_PAYMENT`, al iniciar y cada hora. Redis reiniciado o token vencido invalida el enlace: crear reserva nueva para demo.

Archivos críticos a revisar:

- `apps/cgbg-worker/src/app.service.ts`
- `apps/cgbg-backend/src/receipts/receipts.service.ts`
- `apps/cgbg-backend/src/messaging/messaging.service.ts`
- `apps/cgbg-client` (página/formulario de carga de comprobante)

### Brecha importante de mensajería

**WhatsApp no está implementado funcionalmente.** La documentación contempla notificación, pero código probado solo imprime link temporal en consola. No hay proveedor/configuración/envío WhatsApp confirmado.

El backend intenta enviar correo de reserva con plantilla `appointment-pending`; en configuración por defecto observada no estaba esa plantilla. Además, el token de carga se crea en worker después del email inicial, así que ese correo no puede incluirlo con arquitectura actual. Para producción debe implementarse uno de estos diseños:

1. Worker crea token y envía email/WhatsApp con link.
2. Backend crea/persiste token antes de publicar evento y lo inyecta en plantilla.
3. Crear endpoint autenticado/firmado para recuperar link sin depender de log.

Para demo local: seguir logs del worker tras reserva nueva y abrir URL impresa. No depender de tokens ni citas de pruebas históricas.

## 5. SMTP

SMTP se configura como proveedor Nodemailer en `libs/email/src/providers/nodemailer.provider.ts`, desde configuración SaaS/global. Requiere host, puerto, usuario, contraseña y remitente; configurar TLS según proveedor. Probar conexión antes de usar flujo de reserva.

SMTP puede enviar correos, pero no soluciona por sí solo entrega del link de comprobante: falta integrar token al mensaje como se explica arriba.

## 6. Pruebas realizadas

- `npm run build --workspace apps/cgbg-admin`: aprobado. Advertencias no bloqueantes de caché Angular/LMDB y algunos imports no usados en `SaasBalanceComponent`.
- `npm run build --workspace apps/cgbg-backend`: aprobado.
- Se probaron endpoints de cita creando dato temporal, cambiando a `AUTHORIZED`, completando por API y eliminando dato de prueba.
- Se verificó endpoint de validación de enlace de comprobante mientras token aún era válido.
- Servicios fueron reiniciados y devolvieron HTTP 200 durante la última sesión operativa.

No afirmar que servicios, token o datos de julio siguen activos. Antes de demo ejecutar prueba de punta a punta nueva: reserva, obtener link de log, subir PDF/JPG, revisar cita, aprobar pago.

## 7. Riesgos, deuda y propuestas

1. Implementar entrega real del link de pago por correo y/o WhatsApp; hoy depende de logs del worker.
2. Implementar reintentos/backoff de RabbitMQ y Redis en worker.
3. Añadir prueba end-to-end automatizada para reserva, comprobante, aprobación, cancelación y reprogramación.
4. Conectar disponibilidad real al selector de horario en modal admin.
5. Revisar codificación de textos: persisten fragmentos con mojibake (`Ã³`, etc.) en archivos antiguos. Corregir archivo por archivo y validar interfaz; no hacer reemplazo global ciego.
6. Ruta `verify-email` contiene enlace histórico `/auth/login` mientras ruta activa es `/login`; wildcard lo hace funcionar, pero conviene normalizar.
7. Revisar visualmente tarjeta de Clientes: se reportó icono de calendario superpuesto al contador. Se atendieron estilos alrededor de Citas, pero no existe registro suficientemente preciso del archivo de Clientes; inspeccionar estado actual antes de tocarlo.
8. Confirmar estado de migraciones Prisma antes de crear o modificar modelos. No reconstruir tablas manualmente ni borrar volumen PostgreSQL.

## 8. Expansión de negocio propuesta (sin cambios aplicados)

Arquitectura multi-tenant, categorías, servicios, sucursales y citas puede servir pastelerías/cocinas económicas u otros servicios. Venta de productos requiere módulo separado: catálogo SKU, inventario, carrito/pedido, pagos, entregas/recogida, impuestos y reportes. No debe forzarse dentro de `Appointment`.

## 9. Protocolo para siguiente LLM

1. Leer documentación indicada en sección 1 y este archivo.
2. Inspeccionar cambios existentes antes de editar; árbol puede contener trabajo de usuario no versionado.
3. Comprobar Docker/WSL y salud de DB, Redis, RabbitMQ antes de culpar frontend.
4. Reiniciar worker después de infraestructura si hubo `ECONNREFUSED`.
5. Validar cada cambio con build de paquete afectado y, para flujos, petición real de API.
6. Usar UTC de extremo a extremo en reserva/calendario; no volver a conversiones locales implícitas.
7. Mantener estados de cita y guardas de transición; no actualizar estado directo desde UI sin endpoint validado.
8. No exponer secretos, tokens de comprobante, correos personales ni credenciales en commits o informes.

## 10. Resumen de alcance histórico

Además de correcciones anteriores de registro de negocio, catálogos, horarios y navegación, el trabajo principal entregado cubrió: estabilidad de citas tenant, flujo de aprobación de comprobantes, calendario funcional por vistas, consistencia UTC, dropdown de acciones, estados visuales y corrección de verificación de correo repetida.

Lo que queda claramente fuera de “terminado” es envío confiable del enlace de comprobante a cliente y WhatsApp real. Tratar ambos como requisito pendiente, no como funcionalidad ya desplegada.
