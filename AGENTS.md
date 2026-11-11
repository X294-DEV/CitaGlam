# AGENTS.md — CitaGlam

Guía para cualquier agente de IA (Codex, Claude u otro) que trabaje en este repositorio. Léela completa antes de editar. Si algo de aquí contradice un issue, detente y pregunta al integrante humano.

## Qué es el proyecto

SaaS multi-tenant de agenda, recordatorios y catálogo para negocios de belleza (barberos, estilistas y maquillistas independientes). Cada negocio (tenant) tiene su página pública en `/[slug]` donde se reservan citas y se ven servicios y productos. Proyecto escolar, entrega el **3 de diciembre de 2026**.

## Estructura del monorepo

| Ruta | Qué es | Puerto local |
| --- | --- | --- |
| `apps/cgbg-backend` | API NestJS | 3001 |
| `apps/cgbg-admin` | Panel Angular (superadmin y tenant) | 4200 |
| `apps/cgbg-client` | Sitio público Next.js | 3000 |
| `apps/cgbg-worker` | Worker NestJS (RabbitMQ + Redis). Se reemplaza por pg-boss en el Sprint 2 | — |
| `libs/prisma` | `schema.prisma`, migraciones, `PrismaService` | — |
| `libs/email`, `libs/shared-types`, `libs/assets` | Código compartido | — |
| `docs/` | Especificación original (diseño de hace años: NO es verdad absoluta, se puede corregir con una decisión documentada) | — |
| `docs/scrum/` | Plan de sprints, backlog y prompt del orquestador | — |

Servicios de apoyo en Docker: PostgreSQL (5433), Redis (6379), RabbitMQ (5672 / 15672).

## Comandos

```bash
# Infraestructura primero, luego las apps (el backend tarda 60-90 s por prisma generate)
docker compose up -d cgbg-db cgbg-redis cgbg-mq
docker compose up -d cgbg-backend cgbg-client cgbg-admin cgbg-worker

# Si el worker marca ECONNREFUSED, reiniciarlo cuando la infraestructura ya esté sana
docker compose restart cgbg-worker

# Build del paquete que tocaste (obligatorio antes de cada PR)
npm run build --workspace apps/cgbg-backend
npm run build --workspace apps/cgbg-admin
npm run build --workspace apps/cgbg-client
npm run build --workspace apps/cgbg-worker

# Migraciones (solo la pareja dueña del esquema, ver abajo)
npx prisma migrate dev --schema=libs/prisma/prisma/schema.prisma
```

Confirma los scripts exactos en el `package.json` de cada app si un comando falla.

## Reglas para agentes

1. Trabaja **solo en el issue asignado** a tu pareja. No edites archivos fuera de tu área sin abrir otro issue.
2. Antes de editar, lee el issue y solo las secciones de este archivo que te tocan. No releas todo el proyecto.
3. Una rama por issue, creada desde `main` actualizado: `pareja-N/S0-02-descripcion-corta`. Nunca hagas push directo a `main`.
4. **Nunca** ejecutes `git reset --hard`, `git checkout -- <archivo>`, `git push --force` ni borres carpetas o volúmenes de Docker sin que el humano lo pida.
5. **Cambios al `schema.prisma` y migraciones: solo la pareja 1.** Si necesitas un cambio de esquema, abre un issue para la pareja 1. Dos migraciones en paralelo es el conflicto más caro del proyecto.
6. No subas `.env`, credenciales, tokens, logs, `node_modules`, builds, respaldos ni datos reales de clientes. `.env.example` solo lleva valores falsos.
7. Los archivos se guardan en UTF-8. Si ves `Ã³` o similares, corrige ese archivo con cuidado; no hagas reemplazos globales ciegos.
8. Verifica cada cambio: build del paquete afectado y, para flujos de API, una petición real. No afirmes que algo funciona sin haberlo ejecutado.
9. Si no sabes algo, pregunta. No inventes campos, endpoints ni decisiones de negocio.

## Lista de seguridad (se revisa en cada PR)

- Toda consulta de datos de un negocio filtra por `tenantId` **tomado del JWT**, nunca del cuerpo ni de parámetros de la petición.
- Los endpoints del panel exigen rol (`ADMIN` o `STAFF`) además de JWT.
- Nunca devolver entidades completas de `User`: usar `select` explícito, sin `password`, `activationToken`, `resetPasswordToken` ni similares.
- Endpoints públicos: validar entrada, tener límite de peticiones y no exponer datos de otras personas.
- Archivos subidos: validar el tipo real del contenido, no confiar en `originalname` ni en el `mimetype` del cliente, y no servir comprobantes públicamente.
- Sin secretos en el código y sin valores de respaldo para secretos (`process.env.X || 'valor'`).

## Decisiones vigentes y planeadas

- **Zona horaria:** hoy se guarda la hora local como si fuera UTC, de extremo a extremo. No agregues conversiones locales nuevas. En el Sprint 1 se pasa a `Timestamptz` con zona horaria por sucursal.
- **Citas:** hoy son bloques de 1 hora e ignoran `durationMin`. El Sprint 1 usará la duración real y una restricción en base de datos contra citas encimadas.
- **Clientes finales:** hoy son `User` con rol `CLIENT`. El Sprint 1 introduce el modelo `Customer` por tenant (`@@unique([tenantId, phone])`).
- **Cola y token de pago:** hoy RabbitMQ + Redis. El Sprint 2 los reemplaza por pg-boss y un token de pago guardado (con hash) en PostgreSQL, con vigencia de 30 a 60 minutos.
- **WhatsApp:** un solo número de CitaGlam para todos los tenants, solo plantillas de utilidad (confirmación, recordatorio, link de pago). Sin mensajes de marketing por ese número.
- **Productos (deseable, Sprint 3-4):** categorías y productos por tenant, el cliente "aparta" desde la página del slug, el negocio confirma la venta y se cobra en el local. Estados: `RESERVED`, `SOLD`, `CANCELLED`. Se guarda el precio al momento del apartado. Límite por plan con `maxProducts`.

## Responsables por área

| Pareja | Área | Archivos principales |
| --- | --- | --- |
| 1 (Aioria) | Backend de citas, clientes, auth y **esquema Prisma** | `apps/cgbg-backend/src/{appointments,clients,auth,users}`, `libs/prisma` |
| 2 (Ángel) | Pagos, mensajería, worker y comprobantes | `apps/cgbg-backend/src/{receipts,messaging}`, `apps/cgbg-worker`, `libs/email` |
| 3 (Marjorie) | Panel Angular | `apps/cgbg-admin` |
| 4 (Adrián) | Cliente público, calidad, despliegue y documentación | `apps/cgbg-client`, `docker*`, `.github`, `docs/` |

## Definición de hecho

- El código compila (build del paquete afectado).
- Se probó el comportamiento descrito en los criterios de aceptación.
- La lista de seguridad de arriba está revisada.
- El PR usa la plantilla, referencia el issue (`Closes #N`) y fue revisado por otra pareja.
- Si cambió una decisión, quedó anotada en `docs/` o en este archivo.
