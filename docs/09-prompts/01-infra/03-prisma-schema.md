# Prompt: REQ-INF-03 - Implementación del Schema de Prisma

**Objetivo**: Generar el esquema de persistencia para el Monorepo **CGBG** utilizando **Prisma ORM**, incluyendo la definición de las **13 entidades principales** y sus relaciones.

**Ubicación del Archivo**: `docs/07-codigo/cgbg-webapp/libs/prisma/schema.prisma`

---

## 🛠️ Instrucciones de Ejecución

Por favor, genera el archivo `schema.prisma`. El esquema debe estar diseñado para la **Multitenencia** (Shared Schema) incluyendo el campo `tenantId` donde sea requerido.

### 1. Definición del Esquema (Prisma)
Asegúrate de incluir las 13 entidades descritas en el documento de base de datos (`08-base-de-datos/`):

1.  **User**: Perfiles con roles (SUPERADMIN, TENANT, CUSTOMER).
2.  **Customer**: Relación 1:1 con User.
3.  **Tenant**: El negocio central vinculado a un User Propietario.
4.  **GlobalSettings**: Configuración maestra sin tenantId.
5.  **Templates**: Catálogo de diseños OnePage.
6.  **SubscriptionPackages**: 
    - Campos: `id`, `name`, `monthlyPrice`, `yearlyPrice`, `limits` (JSONB), `features` (JSONB).
7.  **TenantConfig**: Personalización visual (JSONB) del Tenant.
8.  **TenantPaymentMethods**: Métodos de pago manuales (Link a Tenant).
9.  **Branch**: Sucursales ligadas al Tenant.
10. **Service**: Catálogo de oferta.
11. **WorkSchedule**: Horarios semanales recurrentes.
12. **NonWorkingDays**: Días no laborables/excepciones.
13. **Appointment**: Gestión de citas con estados (PENDING_PAYMENT, WAITING_APPROVAL, AUTHORIZED, COMPLETED, CANCELLED).

**💡 Consideración Crítica**: Todas las tablas operativas (Branch, Service, Appointment, etc.) deben incluir:
- El campo `tenantId: String`.
- Un índice compuesto: `@@index([tenantId])`.

### 2. Archivo de Semilla (`seed.ts`)
Genera un script de inicialización (`seed.ts`) para cargar los datos maestros:
- **GlobalSettings**: `maintenanceMode: false`, `maintenanceBanner: ""`.
- **SubscriptionPackages**: 
    - **Básico**: $199 mensual / $1,990 anual. 
      - `limits`: `{ "maxServices": 5, "maxBranches": 1, "maxCustomers": 100 }`.
      - `features`: `{ "canCustomBranding": false, "canAccessAnalytics": false, "canAcceptReceipts": false }`.
    - **Estándar**: $449 mensual / $4,490 anual.
      - `limits`: `{ "maxServices": null, "maxBranches": 3, "maxCustomers": null }`.
      - `features`: `{ "canCustomBranding": true, "canAccessAnalytics": true, "canAcceptReceipts": true }`.
- **Templates**: 
    - `Default`: Estilo minimalista.
    - `Beauty`: Enfocado en salones de belleza.

---

## 📖 Contexto de Soporte
- La base de datos es **PostgreSQL**.
- Revisa el **ERD (04)** y el **Diccionario de BD (08)** para validar las cardinalidades.
- El seeding debe permitir ejecuciones repetidas (upsert).

**¿El archivo `schema.prisma` y el script de `seed.ts` se han generado correctamente?**
