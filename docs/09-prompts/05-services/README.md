# 05 Servicios y Agenda

# 🛠️ Prompts de Catálogo, Horarios y Carga Masiva

Este directorio contiene las instrucciones para implementar la gestión operativa de los negocios dentro del ecosistema **CGBG**.

---

## 📋 Lista de Prompts (Ejecución Secuencial)

1.  **[01. CRUD de Catálogo](./01-service-catalog-crud.md)**: 
    - Gestión manual de servicios (Nombre, Descripción, Precio, Imagen).
    - Aislamiento por `tenantId`.
2.  **[02. Carga Masiva CSV](./02-bulk-upload-services.md)**: 
    - Descarga de plantilla CSV de ejemplo.
    - Importación masiva con validación fila a fila.
3.  **[03. Horarios Semanales](./03-work-schedule-setup.md)**: 
    - Configuración de la jornada de atención (09:00 - 18:00, etc.).
    - Uso de enteros de hora para slots de 1h.
4.  **[04. Días No Laborables](./04-exception-days-management.md)**: 
    - Bloqueo de fechas específicas (excepciones de agenda).

---

> [!IMPORTANT]
> **Eficiencia en Carga**: El procesamiento de la carga masiva debe realizarse mediante **Batch Inserts** de Prisma para optimizar el rendimiento y evitar múltiples viajes a la base de datos.
