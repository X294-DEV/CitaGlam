# 03 Gestión Tenant

# 🏬 Prompts de Onboarding y Configuración del Negocio

Este directorio contiene las instrucciones para implementar la lógica de administración de los locales/negocios dentro del ecosistema **CGBG**.

---

## 📋 Lista de Prompts (Ejecución Secuencial)

1.  **[01. Alta de Tenant](./01-tenant-creation.md)**: 
    - Registro de negocios y generación de `slugUrl`.
    - Vinculación obligatoria con el `ownerId`.
2.  **[02. Personalización UI](./02-ui-customization.md)**:
    - Gestión dinámica de colores, logos y banners mediante **JSONB**.
3.  **[03. Gestión de Sucursales](./03-branch-management.md)**:
    - CRUD de locales físicos con geolocalización (`lat/lng`).
4.  **[04. Métodos de Pago](./04-payment-methods-setup.md)**:
    - Configuración de datos bancarios para transferencias (Manual Checkout).

---

> [!IMPORTANT]
> **Consistencia de Slugs**: El sistema debe asegurar que no haya duplicidad de slugs globales para evitar colisiones en las rutas de Next.js (ej: `/mi-negocio`).
