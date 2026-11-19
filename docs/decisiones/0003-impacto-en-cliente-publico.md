# 0003 — Impacto del Sprint 1 y 2 en el cliente público (`apps/cgbg-client`)

- **Estado:** actualizado el 19-nov-2026 con las respuestas de la pareja 1 (PR #23). Pendiente: contrato escrito (S1-05) y respuestas de la pareja 2 sobre comprobantes
- **Autor:** pareja 4 (Adrián)
- **Fecha:** 18 de noviembre de 2026

## Contexto

Este documento es el equivalente de `0002-impacto-en-panel.md` para el sitio público Next.js. Lista qué partes del cliente se ven afectadas por las decisiones de `AGENTS.md`: `Customer` por tenant, duración real de citas, `Timestamptz` con zona por sucursal, pg-boss y token de pago en PostgreSQL, y los endpoints públicos con límite de peticiones.

Rutas relativas a `apps/cgbg-client/`. Las líneas se leyeron sobre `main` el 18-nov-2026.

> Alcance: solo el cliente. Los nombres del contrato futuro deben salir de la pareja 1. No se inventan campos.

## Inventario (el cliente es pequeño: 521 líneas)

| Ruta | Archivo | Tipo | Qué hace |
| --- | --- | --- | --- |
| `/` | `app/page.tsx` | Estático | Portada con instrucciones para abrir un slug |
| `/[slug]` | `app/[slug]/page.tsx` | Servidor, `no-store` | Carga negocio, sucursales y servicios; pinta `BookingForm` |
| `/upload-receipt/[token]` | `app/upload-receipt/[token]/page.tsx` | Servidor | Solo pasa el token a `ReceiptUploadForm` |
| (componente) | `app/components/BookingForm.tsx` | Cliente | Formulario de reserva, horarios y confirmación |
| (componente) | `app/components/ReceiptUploadForm.tsx` | Cliente | Valida el enlace y sube el comprobante |
| (componente) | `app/components/ThemeInjector.tsx` | Servidor | Inyecta colores del negocio con `dangerouslySetInnerHTML` |
| (componente) | `app/components/PwaSafetyHandler.tsx` | Cliente | Desregistra service workers |

### Endpoints que consume

| Origen | Endpoint | Dónde |
| --- | --- | --- |
| Servidor (`API_INTERNAL_URL`) | `GET /tenants/config/:slug` | `app/[slug]/page.tsx:20` |
| Servidor | `GET /tenants/public/:slug/branches` | `app/[slug]/page.tsx:21` |
| Servidor | `GET /tenants/public/:slug/services` | `app/[slug]/page.tsx:22` |
| Navegador (`NEXT_PUBLIC_API_URL`) | `GET /appointments/available` | `BookingForm.tsx:51` |
| Navegador | `POST /appointments/public` | `BookingForm.tsx:82` |
| Navegador | `GET /receipts/validate/:token` | `ReceiptUploadForm.tsx:23` |
| Navegador | `POST /receipts/upload/:token` | `ReceiptUploadForm.tsx:42` |

## Hallazgos generales

- **Todo está tipado con `any`.** `tenant`, `branches`, `services`, `confirmation` y `appointment` no tienen interfaz (`app/[slug]/page.tsx:23-25`, `BookingForm.tsx:25-26,39`, `ReceiptUploadForm.tsx:18`). El compilador no avisará de ningún cambio de contrato. `libs/shared-types` solo tiene un `README.md` y el cliente no lo usa.
- **Sin manejo de slug inexistente.** Si `/tenants/config/:slug` responde 404, `getJson` lanza error y el usuario ve la página de error de Next, no un "negocio no encontrado" (`app/[slug]/page.tsx:8`).
- **Sin pruebas.** No hay tests en el cliente.
- **Texto de desarrollo visible al público.** `app/[slug]/page.tsx:54-57` ("Flujo local completo: ... Redis") y `BookingForm.tsx:116-119` ("el worker imprime en consola ... Redis durante 24 horas"). Mencionan RabbitMQ/Redis, que se reemplazan en el Sprint 2.
- **`logoUrl` y colores vienen del negocio** y se pintan sin validar (ver "Seguridad").

## 1. Zona horaria (`Timestamptz` + zona por sucursal)

Hoy el cliente fuerza UTC de extremo a extremo para que la hora local "sobreviva".

| Archivo:línea | Qué hace | Cambio esperado |
| --- | --- | --- |
| `BookingForm.tsx:5-9` `todayIsoDate()` | "Hoy" según el reloj del navegador | Debe ser "hoy" en la zona de la sucursal |
| `BookingForm.tsx:11-18` `formatAppointmentDateTime` | Formatea con `timeZone: "UTC"` | Formatear con la zona de la sucursal (la API debe devolverla) |
| `BookingForm.tsx:50` | Envía `date` como `${date}T12:00:00.000Z` | Enviar fecha pura (`YYYY-MM-DD`) y `branchId`; la zona la resuelve el servidor |
| `BookingForm.tsx:73` | Arma `startTime` como `${date}T${slot}:00.000Z` | Con `Timestamptz`, el servidor debería devolver los horarios como instantes ISO y el cliente reenviar el elegido tal cual |
| `ReceiptUploadForm.tsx:6-13` | Misma función duplicada, con `timeZone: "UTC"` | Extraer a un solo helper compartido |

Dependencias: la API debe incluir la zona de la sucursal en `/tenants/public/:slug/branches` y devolver `startTime` con zona. Respuesta de la pareja 1: `available` devuelve opciones con `startTime` y `endTime` en ISO con zona, y `Branch` expone `timezone` (IANA). El cliente deja de armar `startTime` con `Z`.

## 2. Duración real de citas

| Archivo:línea | Qué usa | Cambio esperado |
| --- | --- | --- |
| `BookingForm.tsx:51` | `available` recibe `serviceId` | Sin cambio de llamada; el servidor calcula huecos con `durationMin` |
| `BookingForm.tsx:154-156` | Opciones `nombre · $precio` | Mostrar la duración del servicio (el campo ya existe en el panel) |
| `BookingForm.tsx:171` | Muestra `selectedService.description` | Agregar duración y, si aplica, hora de fin del horario elegido |
| `BookingForm.tsx:112` | Confirmación sin hora de fin | Mostrar rango inicio-fin |

El cliente no calcula huecos: solo pinta lo que devuelve `/available`. El cambio es de presentación.

## 3. Clientes finales (`Customer`)

| Archivo:línea | Qué hace | Cambio esperado |
| --- | --- | --- |
| `BookingForm.tsx:77-79` | Parte `fullName` por el primer espacio; `lastName` por defecto es `"Cliente"` | Confirmado: `lastName` y `email` son obligatorios. Pedir nombre y apellido por separado; dejar de usar `"Cliente"` como apellido |
| `BookingForm.tsx:84-90` | `clientInfo` con `firstName`, `lastName`, `email`, `phone`, `termsAccepted` | Contrato nuevo de la pareja 1; `phone` pasa a ser la llave por tenant |
| `BookingForm.tsx:189-191` | `email` y `phone` obligatorios, sin formato | Normalizar teléfono (con lada) antes de enviar; decidir si `email` sigue obligatorio |
| `BookingForm.tsx:192-195` | `termsAccepted` sin enlace a los términos | Enlazar texto de términos/aviso de privacidad (también aplica a WhatsApp) |

El backend no debe devolver datos de otras personas en `POST /appointments/public` (ver issue crítico del `User` completo). El cliente solo debería leer `service.name`, `startTime` y `payment.amount` (`BookingForm.tsx:111-113`); conviene tipar ese contrato mínimo.

## 4. Pago: pg-boss y token en PostgreSQL

| Archivo:línea | Qué hace | Cambio esperado |
| --- | --- | --- |
| `BookingForm.tsx:116-119` | Dice que el link está en consola y en Redis 24 h | Reescribir: el link llega por WhatsApp o correo y vence en 30-60 min |
| `app/[slug]/page.tsx:54-57` | Texto sobre Redis | Quitar |
| `ReceiptUploadForm.tsx:23` | `validate/:token` con mensaje del servidor | Distinguir enlace vencido, usado e inválido con mensajes propios |
| `ReceiptUploadForm.tsx:30-50` | Subida con `FormData`; el cliente no muestra qué pasa tras enviar | Mostrar estado "en revisión" y qué sigue |
| `ReceiptUploadForm.tsx:70` | `accept="image/jpeg,image/png,application/pdf"` | Solo ayuda de UX; la validación real es del servidor. Agregar límite de tamaño visible |
| `ReceiptUploadForm.tsx` (completo) | No hay manera de pedir un enlace nuevo si venció | Pregunta para la pareja 2: ¿habrá reenvío del enlace? |

## 5. Seguridad del cliente

- **Límite de peticiones:** el backend ya aplica `@Throttle` en `POST /appointments/public` y en los endpoints de comprobantes. El cliente no maneja el estado 429: `BookingForm.tsx:99` muestra `body.message` o un texto genérico. Conviene un mensaje claro de "intenta de nuevo en unos minutos".
- **CAPTCHA:** pendiente de decisión; si se agrega, entra en `BookingForm.tsx` antes de `submit`.
- **`ThemeInjector.tsx:9-17`:** interpola `primaryColor` y `secondaryColor` dentro de `<style>` con `dangerouslySetInnerHTML`. Si el valor lo controla el negocio y no se valida en el backend, es una inyección de CSS/HTML (`</style><script>`). Validar con regex `^#[0-9a-fA-F]{6}$` en el cliente **y** en el DTO del backend.
- **`logoUrl`:** se pone en `<img src>` sin validar esquema (`app/[slug]/page.tsx:35`). Aceptar solo `https:`.
- **Token en la URL:** `/upload-receipt/[token]` expone el token en historial y en el encabezado `Referer`. Agregar `Referrer-Policy: no-referrer` y `X-Robots-Tag: noindex` en esa ruta.
- **Variables de entorno:** `NEXT_PUBLIC_API_URL` y `API_INTERNAL_URL` tienen valor de respaldo (`localhost:3001`, `cgbg-backend:3001`). Para la demo en Vercel no es un secreto, pero un respaldo silencioso a `localhost` en producción oculta errores de configuración: fallar si falta en producción.
- **`PwaSafetyHandler.tsx`:** el cliente no tiene service worker ni manifest; el componente desregistra workers ante cualquier `error` de la ventana. Es código inerte. Proponer quitarlo (archivo y su uso en `app/layout.tsx`) si nadie lo necesita.

## 6. Despliegue (demo en Vercel)

- `next.config.ts` está vacío. Falta definir `images.remotePatterns` si se usa `next/image` para logos (hoy es `<img>` con `eslint-disable`).
- `app/[slug]/page.tsx` usa `cache: "no-store"` en las tres consultas: aceptable para la demo; con tráfico real conviene `revalidate` corto para config, servicios y sucursales.
- Con el backend en otro dominio, `enableCors` (`apps/cgbg-backend/src/main.ts:35`) debe incluir el dominio de Vercel.
- El servidor de Next llama a la API por `API_INTERNAL_URL`; en Vercel no existe la red interna de Docker, así que debe apuntar a la URL pública del backend.

## Resumen de trabajo para Sprint 1-2 (propuesta, sin crear issues todavía)

1. Tipos del contrato público (`Tenant`, `Branch`, `Service`, `Appointment` público) y eliminar `any`. Depende de la pareja 1.
2. Un solo helper de fecha/zona; quitar `timeZone: "UTC"` fijo. Depende de zona por sucursal.
3. Mostrar duración y rango horario.
4. Formulario de reserva con el contrato `Customer`: nombre, teléfono normalizado, términos enlazados.
5. Textos de pago nuevos y estados de enlace (vencido, usado, en revisión).
6. Endurecer `ThemeInjector`, `logoUrl`, 429 y encabezados de la ruta del token.
7. Página de "negocio no encontrado" para slug inválido.
8. Quitar `PwaSafetyHandler` si no hay PWA.

## Respuestas de la pareja 1 (PR #23, 19-nov-2026)
Definiciones del contrato futuro; no significan que `main` ya las implemente.

1. `email` y `lastName` de `Customer` son obligatorios.
2. La reserva pública (`POST /appointments/public`) manda los datos del cliente; el backend resuelve o crea el `Customer` del negocio. `customerId` es solo del panel.
3. Horas como ISO 8601 con zona (`Timestamptz`); `Branch.timezone` es un identificador IANA. Hasta publicar el contrato se mantiene la convención UTC actual.
4. `available` devuelve opciones con `startTime` y `endTime`.
5. `birthday` queda fuera del Sprint 1.
6. Contrato escrito comprometido para el 19-nov-2026.
7. La aceptación de términos es de la reserva/cita; el backend la valida y registra la fecha con su reloj.

Las tareas del cliente están en el issue S1-07 (#36); el captcha, en S1-08 (#37).

## Preguntas abiertas

1. **Pareja 2:** ¿Habrá reenvío de enlace de pago vencido? ¿Por qué canal llega el primero (WhatsApp, correo o ambos)?
2. **Equipo:** ¿Se agrega CAPTCHA al formulario público o basta el límite de peticiones? (S1-08)
