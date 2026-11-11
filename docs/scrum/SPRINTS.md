# CitaGlam — Plan de sprints

**Entrega:** jueves 3 de diciembre de 2026. **Repositorio:** https://github.com/X294-DEV/CitaGlam

## Equipo (parejas = integrante + su agente de IA)

| Pareja | Integrante | GitHub | Área |
| --- | --- | --- | --- |
| 1 | Aioria | `adg160123-cyber` | A: backend de citas, clientes, auth y esquema Prisma |
| 2 | Ángel | `abalam915-eng` | B: pagos, mensajería, worker y comprobantes |
| 3 | Marjorie | `Marjoxp` | C: panel Angular |
| 4 | Adrián | `X294-DEV` | D: cliente público, calidad, despliegue y documentación |

## Calendario

| Sprint | Fechas | Objetivo |
| --- | --- | --- |
| 0 | 11-13 nov | Git y repo, `AGENTS.md`, y los críticos de seguridad de la auditoría |
| 1 | 14-18 nov | Núcleo: modelo `Customer`, zona horaria por sucursal, `durationMin`, restricción contra citas encimadas, captcha en reserva pública |
| 2 | 19-22 nov | El cliente recibe su link: token de pago en Postgres, pg-boss, correo y WhatsApp (número de prueba) |
| 3 | 23-26 nov | Prueba de punta a punta, despliegue de la demo y CRUD de productos (deseable) |
| 4 | 27-30 nov | Pulido, bugs, documentación, vitrina pública de productos (deseable) y guion de la demo |
| Margen | 1-2 dic | Ensayo y correcciones. Sin funciones nuevas |

Orden de recorte si hay retraso: 1) productos, 2) WhatsApp (queda solo correo), 3) pulido visual. El Sprint 2 con correo es el mínimo para una demo completa.

## Decisiones de producto tomadas

- **Productos, Nivel 1.5:** categorías de productos por tenant, el cliente "aparta" desde la página del slug dejando nombre y teléfono, el negocio confirma la venta y se cobra en el local. Estados `RESERVED`, `SOLD`, `CANCELLED`. Se guarda el precio al apartar. Límite `maxProducts` configurable por plan. No se muestran productos por WhatsApp.
- **WhatsApp:** un solo número de CitaGlam, solo plantillas de utilidad.
- **Despliegue de la demo:** frontends en Vercel, backend en un servicio con contenedor, base de datos en Neon o Supabase, comprobantes en almacenamiento de objetos. Redis y RabbitMQ se eliminan.
- **Usuarios objetivo:** barberos, estilistas y maquillistas independientes. Una sola sucursal por defecto.

## Flujo de trabajo

1. Todo cambio entra por issue y pull request contra `main`, revisado por otra pareja.
2. Ramas: `pareja-N/S0-02-descripcion-corta`.
3. Labels: `sprint-N`, `pareja-N`, `backend`, `frontend`, `database`, `docs`, `seguridad`, `bug`, `deuda`, `bloqueado`, `deseable`, `orquestador-review`.
4. Cada sprint es un Milestone. Al cerrar: `docs/scrum/CIERRE_SPRINT_N.md` con completado, pendiente, decisiones y riesgos.
5. Las reglas para agentes y la lista de seguridad están en `AGENTS.md`.

## Carga de issues en GitHub

Con GitHub CLI autenticado, desde la raíz del repo:

```powershell
# Primero en seco, para ver qué haría
./docs/scrum/crear-labels-milestones-e-issues.ps1 -DryRun
# Después en serio
./docs/scrum/crear-labels-milestones-e-issues.ps1
```

Si una persona aún no aceptó la invitación al repo, el issue se crea sin responsable y se asigna después.
