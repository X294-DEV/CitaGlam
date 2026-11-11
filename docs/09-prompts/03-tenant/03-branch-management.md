# Prompt: REQ-TEN-03 - Gestión de Sucursales (Directorio de Locales)

**Objetivo**: Implementar el CRUD de sucursales para que un Tenant pueda gestionar sus diferentes ubicaciones físicas.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-backend/src/modules/tenants/`

---

## 🛠️ Instrucciones de Ejecución

Implementa la gestión de sucursales en el backend.

### 1. DTO de Sucursal (`branch.dto.ts`)
- `name`: Nombre descriptivo (ej: "Sucursal Centro").
- `address`: Dirección completa.
- `phone`: Contacto local.
- `lat` / `lng`: Coordenadas geográficas (Decimal).

### 2. TenantsService (`tenants.service.ts`) / BranchService
- Implementa `createBranch(tenantId, branchData)`:
    - Crea la entrada en la tabla `Branch`.
    - Asocia el `tenantId` automáticamente del usuario logueado.
- Implementa `getBranches(tenantId)`: Lista todas las sucursales del negocio.
- Implementa `deleteBranch(id, tenantId)`: Eliminación lógica o física validando propiedad.

### 3. TenantsController (`tenants.controller.ts`)
- **GET `/tenants/branches`**: Lista sucursales.
- **POST `/tenants/branches`**: Crea sucursal.
- **PATCH `/tenants/branches/:id`**: Edita sucursal.

---

## 📖 Contexto de Soporte
- Consulta el documento de **Base de Datos (08)** para los campos de la tabla `Branch`.
- El aislamiento por `tenantId` es obligatorio.

**¿Se ha implementado el CRUD de sucursales correctamente?**
