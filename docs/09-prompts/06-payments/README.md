# 06 Pagos y Comprobantes

# 💸 Prompts de Gestión de Pagos, Comprobantes y RabbitMQ

Este directorio contiene las instrucciones para implementar el flujo asíncrono de verificación de pagos manuales dentro del ecosistema **CGBG**.

---

## 📋 Lista de Prompts (Ejecución Secuencial)

1.  **[01. Infraestructura RabbitMQ](./01-rabbitmq-infrastructure.md)**: 
    - Configuración entre **Backend** (Productor) y **Worker** (Consumidor).
    - Evento `appointment.created`.
2.  **[02. Link de Pago (Redis)](./02-payment-link-generation.md)**: 
    - Generación de token único con **TTL de 24 horas**.
    - Simulación de envío de notificación por consola.
3.  **[03. Carga de Comprobante](./03-receipt-upload-logic.md)**: 
    - Endpoint para subida de JPG/PDF (Multer).
    - Validación de vigencia del token en Redis.
4.  **[04. Aprobación Administrador](./04-admin-approval-workflow.md)**: 
    - Panel para que el Tenant vea los comprobantes.
    - Cambio de estatus a `AUTHORIZED` o `CANCELLED`.

---

> [!IMPORTANT]
> **Seguridad de Archivos**: Los comprobantes deben almacenarse de forma segura y asociarse únicamente a la cita original para evitar el acceso no autorizado a datos sensibles.
