---
title: "[S0-04] Secretos obligatorios, CORS restringido y configuración segura"
labels: sprint-0,pareja-4,backend,seguridad
assignee: X294-DEV
---
## Objetivo
El secreto del JWT tiene un valor de respaldo en tres archivos (`jwt.strategy.ts` línea 12, `auth.module.ts` línea 18, `auth.service.ts` línea ~365) y es el mismo que aparece en `.env.example`. La contraseña de Postgres es predecible y el CORS está abierto a cualquier origen (`main.ts`, `app.enableCors()`).

## Alcance
- Quitar los valores de respaldo de `JWT_SECRET`: si falta la variable, la app **no arranca**.
- Generar un secreto nuevo (`openssl rand -base64 48`) solo en el `.env` local de cada integrante. `.env.example` lleva placeholders claros (`CAMBIAR_ESTE_VALOR`), no valores reales.
- Cambiar la contraseña de Postgres por una sin caracteres especiales (hoy `DATABASE_URL` lleva un `@` sin codificar). Nota: cambiar `POSTGRES_PASSWORD` no modifica un volumen ya creado; usar `ALTER USER` o acordar con el equipo antes de recrear el volumen.
- En `docker-compose.yml`, usar variables obligatorias (`${POSTGRES_PASSWORD:?falta}`) y publicar puertos de Postgres, Redis y RabbitMQ solo en `127.0.0.1`.
- Restringir CORS a los orígenes de `FRONTEND_URL` y `WEB_URL`.
- Agregar `helmet` al backend.

## Criterios de aceptación
- [ ] Arrancar el backend sin `JWT_SECRET` falla con un mensaje claro.
- [ ] Ninguna cadena `CGBG_SECRET_KEY_DEV_2024` ni `@Kodit2023` queda en el repo.
- [ ] Una petición desde un origen no permitido es rechazada por CORS.
- [ ] El stack levanta con el nuevo `.env` y el panel y el cliente público siguen funcionando.
- [ ] Todos los integrantes saben que deben volver a iniciar sesión tras rotar el secreto.

## Dependencias
Coordinar con todas las parejas: cambia el `.env` de cada quien.

## Responsable
Pareja 4 (Adrián).
