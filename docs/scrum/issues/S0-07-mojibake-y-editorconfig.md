---
title: "[S0-07] Corregir mojibake y fijar UTF-8 en el proyecto"
labels: sprint-0,pareja-3,frontend,deuda
assignee: Marjoxp
---
## Objetivo
Persisten textos con codificación rota (`Ã³`, `Ã©`) en archivos antiguos del panel y en mensajes del backend (por ejemplo `appointments.service.ts`, líneas ~151, ~200 y ~299).

## Alcance
- Agregar `.editorconfig` con `charset = utf-8` y `end_of_line = lf` en la raíz.
- Buscar con `grep` las secuencias `Ã` y `Â` en `apps/` y `libs/` y corregir **archivo por archivo**, validando la interfaz. Sin reemplazos globales ciegos.
- Los archivos del backend corresponden a la pareja 1: abrir un PR separado o coordinar con ella.

## Criterios de aceptación
- [ ] `grep -rn "Ã" apps libs --include=*.ts --include=*.html` no devuelve resultados.
- [ ] El panel se ve correcto con acentos y la letra ñ en las pantallas revisadas.
- [ ] `npm run build --workspace apps/cgbg-admin` pasa.

## Dependencias
Ninguna.

## Responsable
Pareja 3 (Marjorie).
