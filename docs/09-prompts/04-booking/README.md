# 04 Motor de Reservas y Agenda

# 🗓️ Prompts del Motor de Agendamiento y Disponibilidad

Este directorio contiene las instrucciones para implementar el núcleo funcional del SaaS **CGBG** dentro de `docs/07-codigo/cgbg-webapp/`.

---

## 📋 Lista de Prompts (Ejecución Secuencial)

1.  **[01. Utilidades de Fecha (UTC/Local)](./01-date-utils-setup.md)**: 
    - Implementación de `DateHelper` para gestión de **UTC** y zona horaria **America/Mexico_City**.
    - Lógica de normalización a **horas cerradas**.
2.  **[02. Motor de Disponibilidad](./02-availability-engine.md)**: 
    - Cálculo de slots de 1 hora.
    - Cruce de horarios, días bloqueados y citas autorizadas.
3.  **[03. Flujo de Reservación](./03-appointment-workflow.md)**:
    - Endpoint de creación de cita y persistencia en UTC.
    - Activación de eventos en **RabbitMQ** para pagos.

---

> [!IMPORTANT]
> **Consistencia Horaria**: Todas las validaciones de disponibilidad deben realizarse convirtiendo primero la fecha de entrada (UTC) a la hora local del negocio para consultar los horarios semanales correctos.
