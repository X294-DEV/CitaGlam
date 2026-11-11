---
title: "[S0-01] Subir el proyecto a GitHub y proteger main"
labels: sprint-0,pareja-4,docs,deuda
assignee: X294-DEV
---
## Objetivo
Que el proyecto tenga control de versiones. Hoy la carpeta no es un repositorio Git, y cualquier cambio de un agente o un error humano es irrecuperable.

## Alcance
- `git init`, revisar que `.gitignore` excluya `.env`, `node_modules`, `dist` y `apps/cgbg-backend/uploads/`.
- Confirmar que no hay `.env` ni comprobantes dentro de lo que se va a subir (`git status` antes del primer commit).
- Primer commit con el estado actual, incluidos `AGENTS.md`, `CLAUDE.md`, `.github/` y `docs/scrum/`.
- Conectar con `https://github.com/X294-DEV/CitaGlam.git` y subir `main`.
- Proteger `main` en GitHub: exigir pull request y al menos 1 aprobación, sin push directo.
- Confirmar que las otras 3 personas aceptaron la invitación como colaboradoras.
- Ejecutar `docs/scrum/crear-labels-milestones-e-issues.ps1` para cargar labels, milestones e issues.

## Criterios de aceptación
- [ ] `git log` muestra el primer commit y el repo remoto lo refleja.
- [ ] `git ls-files` no contiene `.env`, `node_modules`, `uploads/` ni archivos `.pdf`/imágenes de comprobantes.
- [ ] Un intento de push directo a `main` por una colaboradora es rechazado.
- [ ] Los 4 integrantes pueden clonar el repo y crear una rama.

## Dependencias
Ninguna. Bloquea al resto del sprint.

## Responsable
Pareja 4 (Adrián).
