# Prompt: REQ-ADM-01 - Centro de Control SuperAdmin (Gestor Global)

**Objetivo**: Implementar los endpoints administrativos maestros para que los superadministradores del SaaS puedan gestionar la configuración global, los paquetes de suscripción y las plantillas base.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-backend/src/modules/admin/`

---

## 🛠️ Instrucciones de Ejecución

Genera el módulo administrativo maestro con los siguientes requisitos:

### 1. Gestión de Configuración Global (`GlobalSettings`)
- **GET `/admin/settings`**: Obtiene el estado del mantenimiento y llaves de API.
- **PATCH `/admin/settings`**: Actualiza banners y modo mantenimiento.

### 2. Gestión de Paquetes y Plantillas (`SubscriptionPackages` / `Templates`)
- **CRUD Completo**: Incluye la edición de los objetos JSONB `limits` y `features`.
- Permite definir precios mensuales y anuales conforme a la tabla comparativa de planes.

### 3. Monitoreo de Tenants (`GET /admin/tenants`)
- **Filtros (Query Params)**:
    - `q`: Búsqueda por nombre de negocio o email de propietario.
    - `status`: Filtrar activos/suspendidos.
    - `packageId`: Filtrar por tipo de plan.
- **Paginación**: Implementación obligatoria de `page` y `limit`.

---

## 📖 Contexto de Soporte
- Acceso restringido exclusivamente al rol `SUPERADMIN` mediante `RolesGuard`.
- Los filtros deben usar `contains` (Case-insensitive) de Prisma para una mejor experiencia de búsqueda.

**¿Se ha implementado el centro de control para el SuperAdmin correctamente?**
