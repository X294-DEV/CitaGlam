# 08 Base de Datos

# 🗄️ Especificación de Base de Datos: SaaS CGBG (v1.0)

Este documento detalla el esquema relacional y las estrategias de persistencia para el ecosistema **CGBG**.

---

## 1. Arquitectura de Persistencia

El sistema utiliza **PostgreSQL 16** con **Prisma ORM**. La base de datos es única para todos los Tenants (Shared Schema), utilizando una columna de discriminación para el aislamiento.

### 1.1. Estrategia Multitenant
- **Identificador**: `tenantId` (UUID) presente en todas las tablas operativas.
- **Índices**: Cada tabla operativa tiene un índice compuesto o simple sobre `tenantId` para optimizar el rendimiento de las consultas por negocio.
- **Seguridad**: El acceso a los datos se filtra a nivel de aplicación mediante Middlewares de Prisma que inyectan el `tenantId` del contexto JWT.

---

## 2. Diccionario de Entidades (13 Tablas)

### 2.1. Módulo de Identidad y CRM
| Tabla | Descripción | Campos Clave |
| :--- | :--- | :--- |
| **User** | Credenciales y roles. | `email`, `passwordHash`, `role` (Enum). |
| **Customer** | Perfil del cliente final. | `userId` (FK), `phone`, `metadata` (JSONB). |

### 2.2. Configuración Global (SuperAdmin)
| Tabla | Descripción | Campos Clave |
| :--- | :--- | :--- |
| **GlobalSettings** | Ajustes maestros del SaaS. | `maintenanceMode`, `emailConfig` (JSONB). |
| **Templates** | Diseños OnePage base. | `codeReference`, `baseConfig` (JSONB). |
| **SubscriptionPackages** | Planes de pago para Tenants con límites y funciones. | `name`, `monthlyPrice`, `yearlyPrice`, `limits` (JSONB), `features` (JSONB). |

### 2.3. El Tenant y su Negocio
| Tabla | Descripción | Campos Clave |
| :--- | :--- | :--- |
| **Tenant** | Entidad principal del negocio. | `ownerId` (FK), `slugUrl`, `businessName`. |
| **TenantConfig** | Ajustes visuales y de sitio. | `tenantId` (FK), `templateId` (FK), `customConfig` (JSONB). |
| **TenantPaymentMethods** | Métodos de pago aceptados. | `tenantId` (FK), `type` (TRANSFER/CASH). |

### 2.4. Operación y Agenda
| Tabla | Descripción | Campos Clave |
| :--- | :--- | :--- |
| **Branch** | Sucursales del negocio. | `tenantId` (FK), `address`, `lat/lng`. |
| **Service** | Catálogo de servicios. | `tenantId` (FK), `priceAmount`, `priceType`. |
| **WorkSchedule** | Horarios semanales. | `tenantId` (FK), `dayOfWeek`, `startTime/endTime`. |
| **NonWorkingDays** | Días feriados o bloqueados. | `tenantId` (FK), `date`. |
| **Appointment** | Registro de citas. | `tenantId` (FK), `customerId` (FK), `status` (Enum). |

---

## 3. Estructuras Semi-estructuradas (JSONB)

El uso de JSONB es fundamental para la flexibilidad del SaaS:
- **`TenantConfig.customConfig`**: Almacena colores, fuentes, URLs de logos y mensajes de marketing.
- **`GlobalSettings.emailConfig`**: Configuración de SMTP o servicios de correo externos.
- **`Customer.metadata`**: Notas adicionales, preferencias de marketing o historial simplificado.

---

## 4. Estrategia de Migraciones y Seeding

1.  **Migraciones**: Gestionadas por `prisma migrate dev`. No se permiten cambios manuales al esquema de PostgreSQL.
2.  **Seeding (`prisma/seed.ts`)**: 
    - Crea un `SUPERADMIN` por defecto.
    - Inserta los `Templates` iniciales (Modern, Minimal).
    - Configura los `SubscriptionPackages` base (Lite, Pro).

---

## 5. Estándares de Consulta y Reportes

Para garantizar la consistencia en los Dashboards y listados, todos los endpoints de consulta deben soportar:
- **Paginación**: `page` (default 1) y `limit` (default 10).
- **Rangos de Fecha**: `startDate` y `endDate` en formato ISO 8601.
- **Búsqueda**: Parámetro `q` o `search` para filtrado por texto (nombres, correos, descripciones).
- **Aislamiento**: Siempre filtrar por `tenantId` obtenido del JWT (excepto en el SuperAdmin).

---

> [!IMPORTANT]
> Es vital mantener la integridad referencial. Todas las tablas que pertenecen a un Tenant **DEBEN** tener una relación obligatoria con la tabla `Tenant` mediante `tenantId`.
