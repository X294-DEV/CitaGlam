# Prisma 5: conexión directa para migraciones — #59

El repositorio usa Prisma 5.15.0. `schema.prisma` conserva `url = env("DATABASE_URL")` para Prisma Client y agrega `directUrl = env("DIRECT_URL")` para las operaciones CLI de base de datos. No se actualiza Prisma ni se cambia a configuración de Prisma 7.

## Configuración

- Docker local: ambas variables usan la misma conexión, usuario, contraseña y base. `.env.example` contiene un DIRECT_URL falso explícito. No hay valor automático de respaldo: agregarlo al `.env` local existente antes de ejecutar CLI.
- Desde Windows, el contenedor está publicado en `127.0.0.1:5433`; dentro de Compose, usar `cgbg-postgres:5432`.
- Neon: DATABASE_URL debe ser la URL agrupada (host con `-pooler`); DIRECT_URL, la directa (sin `-pooler`) de la misma base y rol, con `sslmode=require`. Copiarlas desde Connect del proyecto de pruebas, sin registrarlas en logs ni subirlas al repo.
- Aplicar con `npx prisma migrate deploy --schema=libs/prisma/prisma/schema.prisma`, luego `prisma generate` y build. No usar migrate dev contra la demo ni borrar volúmenes.

La distinción de conexión está descrita por [Neon para Prisma 6 y anteriores](https://github.com/neondatabase/website/blob/main/content/faqs/find-database-url-neon.md). No copiar el prisma.config.ts de ejemplos para versiones nuevas.

## Evidencia local

`node --env-file=.env --test apps/cgbg-backend/test/direct-url.security.cjs`

Prueba con PostgreSQL 16 del Docker local y una base temporal ficticia. Ejecuta migrate deploy con DATABASE_URL inaccesible y DIRECT_URL válida, comprueba btree_gist y appointment_no_overlap, arranca la API con DATABASE_URL válida y DIRECT_URL inaccesible y crea una cita mediante POST real. Una escritura directa con traslape falla y una adyacente se acepta. Repetir deploy con datos conserva ambas citas. No se modifica la base de trabajo ni sus volúmenes.

## Pendiente de verificación en Neon

El usuario indicó que no hay credenciales locales de Neon y pidió validar localmente, dejando Neon pendiente. No se ha ejecutado la migración ni una consulta a través de un pooler real en Neon. El soporte documentado de [btree_gist en Neon](https://neon.com/docs/extensions/pg-extensions) es evidencia de compatibilidad prevista, no prueba de despliegue.

Antes de cerrar #59, pareja 4 debe aplicar migrate deploy en una rama/base de pruebas de Neon con el rol que usará el despliegue; confirmar permisos de CREATE EXTENSION, existencia de appointment_no_overlap, rechazo de traslapes y reserva desde la app con la conexión agrupada. Registrar resultado sin publicar URLs ni datos reales. El PR de preparación referencia #59 y lo deja abierto hasta esa validación.
