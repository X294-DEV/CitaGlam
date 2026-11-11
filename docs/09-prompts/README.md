# 09 Prompts

# 🤖 Repositorio de Prompts de IA: SaaS CGBG (v1.0)

Este directorio contiene las instrucciones estructuradas para generar el código de cada módulo del sistema utilizando Gemini u otros modelos de lenguaje.

## 📁 Estructura de Prompts

El repositorio sigue el mismo indexado que el [Backlog de Requerimientos](../01-requerimientos/README.md):

1.  **[01. Infraestructura](./01-infra/README.md)**: Setup, Docker, Prisma, Seeding.
2.  **[02. Identidad (Auth)](./02-auth/README.md)**: JWT, Roles, RBAC.
3.  **[03. Gestión Tenant](./03-tenant/README.md)**: Onboarding, JSONB Config.
4.  **[04. Motor de Reservas](./04-booking/README.md)**: Agenda, Slots, Bookings.
5.  **[05. Servicios y Agenda](./05-services/README.md)**: Catálogo, Horarios.
6.  **[06. Pagos y Notif](./06-payments/README.md)**: RabbitMQ, Redis, Receipts.
7.  **[07. Admin/Dash](./07-admin/README.md)**: Dashboards, SuperAdmin.

---

> [!TIP]
> **Uso Recomendado**: Antes de pedirle a la IA que genere código, asegúrate de proveerle el contexto de la carpeta `docs/02-planificacion/`, `docs/03-arquitectura/` y `docs/08-base-de-datos/` para que los tipos de datos y la estructura del monorepo se respeten.
