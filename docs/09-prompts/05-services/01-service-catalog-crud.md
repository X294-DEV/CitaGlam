# Prompt: REQ-SER-01 - Gestión del Catálogo de Servicios (CRUD)

**Objetivo**: Implementar el módulo de servicios en el backend de **NestJS** para que los Tenants puedan administrar su oferta comercial.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-backend/src/modules/services/`

---

## 🛠️ Instrucciones de Ejecución

Genera los archivos para el CRUD de servicios, asegurando el aislamiento por `tenantId`.

### 1. ServicesModule (`services.module.ts`)
- Configura el módulo y registra el `ServicesService` y `ServicesController`.

### 2. ServicesService (`services.service.ts`)
- Implementa `findAll(tenantId)`: Lista servicios filtrados por negocio.
- Implementa `create(tenantId, data)`: Crea un servicio vinculado al Tenant.
- Implementa `update(id, tenantId, data)`: Actualiza validando propiedad.
- Implementa `remove(id, tenantId)`: Eliminación lógica o física.

### 3. ServicesController (`services.controller.ts`)
- **GET `/services`**: Lista servicios del Tenant logueado.
- **POST `/services`**: Crea servicio.
- **PATCH `/services/:id`**: Actualiza servicio.
- **DELETE `/services/:id`**: Elimina servicio.
- Protege todos los endpoints con `JwtAuthGuard` y `RolesGuard(['TENANT', 'SUPERADMIN'])`.

---

## 📖 Contexto de Soporte
- Los campos clave son: `name`, `description`, `priceType` (FIXED/VARIABLE), `priceAmount` y `imageUrl`.
- Utiliza la tabla `Service` definida en el esquema de Prisma.

**¿Se ha implementado el CRUD de servicios correctamente?**
