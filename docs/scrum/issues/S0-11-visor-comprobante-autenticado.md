---
title: "[S0-11] Panel: ver el comprobante con una petición autenticada"
labels: sprint-0,pareja-3,frontend,seguridad
assignee: Marjoxp
---
## Objetivo
Cuando el backend deje de servir `/uploads/receipts` públicamente (S0-05), el panel tiene que pedir el comprobante con el JWT del usuario en lugar de abrir una URL directa.

## Alcance
- En `appointments-list`, obtener el archivo con el endpoint autenticado definido en S0-05 (como blob) y mostrarlo en un visor o ventana.
- Manejar errores (403, 404) con un mensaje visible.
- Soportar imagen y PDF.

## Criterios de aceptación
- [ ] El botón de comprobante abre el archivo para un admin del tenant dueño.
- [ ] Un error de permisos muestra un mensaje en lugar de fallar en silencio.
- [ ] `npm run build --workspace apps/cgbg-admin` pasa.

## Dependencias
Depende de S0-05 (pareja 2).

## Responsable
Pareja 3 (Marjorie).
