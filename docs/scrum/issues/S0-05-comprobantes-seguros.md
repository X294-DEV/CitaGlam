---
title: "[S0-05] Comprobantes: validar el archivo real y dejar de servirlos públicamente"
labels: sprint-0,pareja-2,backend,seguridad
assignee: abalam915-eng
---
## Objetivo
Los comprobantes se sirven como archivos estáticos sin autenticación (`main.ts`, `useStaticAssets` sobre `uploads`) y la única protección es el UUID del nombre. Además, la extensión sale de `originalname` y el tipo del `mimetype` que declara el cliente (`receipts.service.ts`, líneas ~47 y ~73), así que se puede subir un `.html` declarándolo `image/png` y servirlo desde el origen de la API.

## Alcance
- Validar el contenido real del archivo por sus primeros bytes: JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), PDF (`25 50 44 46`).
- Derivar la extensión del tipo validado, nunca de `originalname`. Nombre de archivo generado por el servidor.
- Dejar de exponer `/uploads/receipts` como estático. Crear un endpoint autenticado (por ejemplo `GET /receipts/:appointmentId/file`) que exija rol `ADMIN` o `STAFF` y compruebe que la cita pertenece al `tenantId` del JWT. Enviar `X-Content-Type-Options: nosniff`.
- Revisar `/uploads/proofs` (comprobantes de suscripción) con el mismo criterio.
- Guardar en `Payment.receiptUrl` la ruta interna, no una URL pública.

## Criterios de aceptación
- [ ] Un `.html` renombrado a `.png` es rechazado.
- [ ] Acceder a `/uploads/receipts/<archivo>` sin sesión devuelve 404 o 403.
- [ ] Un admin de otro tenant no puede descargar el comprobante.
- [ ] El panel puede mostrar el comprobante (ver S0-11).
- [ ] `npm run build --workspace apps/cgbg-backend` pasa.

## Dependencias
Coordinar con S0-11 (pareja 3) para el visor en el panel.

## Responsable
Pareja 2 (Ángel).
