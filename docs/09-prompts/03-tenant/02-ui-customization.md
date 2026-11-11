# Prompt: REQ-TEN-02 - Personalización Visual (JSONB UI)

**Objetivo**: Implementar la lógica para actualizar la configuración de marca y estética (colores, fuentes, logos) del sitio del Tenant utilizando el campo **JSONB** de PostgreSQL.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-backend/src/modules/tenants/`

---

## 🛠️ Instrucciones de Ejecución

Implementa el servicio y endpoint para gestionar la configuración visual.

### 1. DTO de Configuración Visual (`tenant-config.dto.ts`)
Define el esquema esperado dentro del campo `customConfig`:
- `primaryColor`: String (Hex).
- `secondaryColor`: String (Hex).
- `logoUrl`: String (URL).
- `bannerText`: String.
- `socialLinks`: JSONB (URL Facebook, Instagram, etc.).

### 2. TenantsService (`tenants.service.ts`)
- Implementa `updateConfig(tenantId, configData)`:
    - Busca la entrada en `TenantConfig`.
    - Realiza un **Deep Merge** o reemplazo del objeto JSONB `customConfig`.
    - Valida que el `tenantId` pertenezca al usuario logueado antes de actualizar.

### 3. TenantsController (`tenants.controller.ts`)
- **PATCH `/tenants/config`**: 
    - Recibe el `UpdateConfigDto`.
    - Protegido por `JwtAuthGuard`.
    - Retorna el objeto de configuración actualizado.

---

## 📖 Contexto de Soporte
- Consulta el documento de **Estructura del Cliente (05-componentes)** para conocer cómo el `ThemeInjector` de Next.js consumirá estos datos.
- Utiliza la funcionalidad nativa de Prisma para actualizar campos JSON.

**¿Se ha implementado el guardado dinámico de configuración visual correctamente?**
