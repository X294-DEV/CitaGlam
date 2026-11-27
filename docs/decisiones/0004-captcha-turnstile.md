# 0004 — Captcha de la reserva pública: Cloudflare Turnstile

- **Estado:** implementado (issue #37)
- **Autor:** pareja 4 (Adrián)
- **Fecha:** 24 de noviembre de 2026

## Decisión

La reserva pública (`POST /appointments/public`) usa **Cloudflare Turnstile**, el mismo proveedor que ya usa la solicitud de registro de negocio (`apps/cgbg-backend/src/admin/admin.service.ts`). No se agrega hCaptcha: sería otro proveedor, otras claves y otro script para el mismo resultado.

## Cómo funciona

- Las claves viven en la configuración global del SaaS (`GlobalConfig.security.turnstileSiteKey` y `turnstileSecretKey`), editables desde el panel de superadmin. No hay claves en el código ni en `.env`.
- El cliente público lee la clave pública de `GET /auth/config/public`, muestra el widget y manda el token como `turnstileToken`.
- El backend (`CaptchaService`) verifica el token con `siteverify` **antes** de tocar la base. Token faltante o inválido: 400. Sin respuesta de Cloudflare (5 s): 503.
- El token es de un solo uso: el formulario pide uno nuevo tras cada intento.
- Sin clave secreta configurada: en desarrollo se omite el desafío (con aviso en el log); con `NODE_ENV=production` se rechaza con 503. La demo debe configurar las claves antes de publicarse.
- El límite de peticiones por IP (`RATE_LIMITS.publicBooking`) se mantiene.

## Claves de prueba (oficiales de Cloudflare)

| Uso | Valor |
| --- | --- |
| Clave pública, siempre aprueba | `1x00000000000000000000AA` |
| Clave secreta, siempre aprueba | `1x0000000000000000000000000000000AA` |
| Clave secreta, siempre rechaza | `2x0000000000000000000000000000000AA` |

Prueba automatizada: `node --env-file=.env --test apps/cgbg-backend/test/captcha.security.cjs` (requiere Docker y salida a Internet).

## Pendiente

- `submitBusinessRequest` sigue con su propia verificación (se omite sin clave, incluso en producción). Conviene migrarla a `CaptchaService` en un issue aparte.
- Registrar el dominio de la demo en el panel de Cloudflare y cargar las claves reales antes del Sprint 3.
