# Prompt: REQ-TEN-01 - Gestión de Onboarding y Creación de Tenants

**Objetivo**: Implementar el módulo de **Tenants** en el backend de **NestJS** para permitir el alta de nuevos negocios y la generación de sus URLs únicas (slugs).

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-backend/src/modules/tenants/`

---

## 🛠️ Instrucciones de Ejecución

Genera los archivos necesarios para el módulo de Tenants, asegurando la integración con **Prisma**.

### 1. TenantsModule (`tenants.module.ts`)
- Configura el módulo y registra el `TenantsService` y `TenantsController`.
- Asegura la exportación del servicio para su uso en la carga de configuración inicial.

### 2. TenantsService (`tenants.service.ts`)
- Implementa `create(data)`:
    - Recibe el `ownerId` (desde el JWT).
    - Valida que el `slugUrl` no esté duplicado.
    - Crea la entrada en la tabla `Tenant` y genera automáticamente una entrada vacía en `TenantConfig`.
- Implementa `findBySlug(slug)`: Retorna los datos básicos del negocio.

### 3. TenantsController (`tenants.controller.ts`)
- **POST `/tenants`**: 
    - Protegido por `JwtAuthGuard` y `RolesGuard(['TENANT', 'SUPERADMIN'])`.
    - Llama a `tenantsService.create()`.
- **GET `/tenants/me`**:
    - Retorna el perfil del Tenant asociado al usuario logueado.

---

## 📖 Contexto de Soporte
- Consulta el documento de **Base de Datos (08)** para los campos de la tabla `Tenant`.
- El `slugUrl` debe ser una cadena limpia (ej: `salon-belleza-merida`) para la navegación dinámica del front-office de Next.js.

**¿Se ha implementado la creación de Tenants correctamente siguiendo la arquitectura?**
