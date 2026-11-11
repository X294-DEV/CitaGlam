---
title: "[S0-08] Mapear las pantallas del panel que dependen de clientes y citas"
labels: sprint-0,pareja-3,frontend,docs
assignee: Marjoxp
---
## Objetivo
En el Sprint 1 los clientes dejan de ser `User` con rol `CLIENT` y pasan a un modelo `Customer`, y las citas usarán duración real y zona horaria. Hay que saber de antemano qué partes del panel se verán afectadas.

## Alcance
Documento en `docs/decisiones/0002-impacto-en-panel.md` con:
- Lista de componentes, servicios y pantallas de `apps/cgbg-admin` que usan datos de cliente (`firstName`, `lastName`, `email`, `phone`) o `startTime`/`endTime`.
- Dónde se asume bloque de 1 hora (`HH:00`) o se convierte la hora (UTC o local), incluido el calendario y la reprogramación.
- Qué tipos de `libs/shared-types` conviene crear para que el compilador detecte cambios de contrato.
- Estimación de esfuerzo por pantalla (S, M, L).

## Criterios de aceptación
- [ ] Documento revisado por la pareja 1.
- [ ] Cada punto cita el archivo y la línea.

## Dependencias
Ninguna. Alimenta el Sprint 1.

## Responsable
Pareja 3 (Marjorie).
