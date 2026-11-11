# 01 Requerimientos

# 📋 Backlog de Requerimientos: SaaS CGBG (v1.0)

Este documento contiene la hoja de ruta modular para el desarrollo del ecosistema CGBG, organizada por prioridad técnica y funcional.

---

## 🚦 Hoja de Ruta y Prioridades

| ID | Módulo | Prioridad | Estado |
| :--- | :--- | :--- | :--- |
| **01** | Infraestructura y Base de Datos | **CRÍTICA** | Pendiente |
| **02** | Identidad y Seguridad (Auth) | **ALTA** | Pendiente |
| **03** | Onboarding y Configuración Tenant | **ALTA** | Pendiente |
| **04** | Motor de Reservas y Agenda | **ALTA** | Pendiente |
| **05** | Servicios, Horarios y Sucursales | **MEDIA** | Pendiente |
| **06** | Pagos (Comprobantes) y RabbitMQ | **MEDIA** | Pendiente |
| **07** | Dashboard y Administración SaaS | **BAJA** | Pendiente |

---

## 📦 Detalle de Módulos

### Módulo 01: Infraestructura (INF) - PRIORIDAD: CRÍTICA
**Meta**: Tener el entorno de desarrollo listo y la base de datos migrada.

- **REQ-INF-01**: Configuración de Monorepo (pnpm/npm workspaces).
- **REQ-INF-02**: Setup de Docker Compose (Postgres, Redis, RabbitMQ).
- **REQ-INF-03**: Implementación del Schema de Prisma (Las 13 entidades: User, Tenant, Appointment, etc.).
- **REQ-INF-04**: Script de Seeding para SuperAdmin y Templates base.
> **💡 Guía para Prompt**: "Genera el archivo schema.prisma basado en el documento de Base de Datos (08) asegurando los índices en tenantId."

### Módulo 02: Identidad (AUTH) - PRIORIDAD: ALTA
**Meta**: Sistema de acceso seguro para todos los usuarios.

- **REQ-AUTH-01**: Registro e Inicio de sesión con JWT (NestJS + Passport).
- **REQ-AUTH-02**: RBAC (Role-Based Access Control) para SUPERADMIN y TENANT.
- **REQ-AUTH-03**: Guardias de ruta y Contexto de Tenant en el API.
> **💡 Guía para Prompt**: "Crea un AuthModule en NestJS con soporte para roles y que incluya el tenantId en el payload del JWT."

### Módulo 03: Gestión Tenant (TEN) - PRIORIDAD: ALTA
**Meta**: Permitir que un negocio se registre y configure su sitio.

- **REQ-TEN-01**: CRUD de Perfil de Tenant (Nombre, Slug, Logo).
- **REQ-TEN-02**: Editor de Configuración Visual (JSONB: Colores, Fuentes).
- **REQ-TEN-03**: Gestión de Sucursales (Directorio de locales).
> **💡 Guía para Prompt**: "Genera un servicio que actualice el campo JSONB customConfig en TenantConfig validando la estructura del tema."

### Módulo 04: Motor de Reservas (BOK) - PRIORIDAD: ALTA
**Meta**: El flujo principal del cliente final.

- **REQ-BOK-01**: Endpoint de consulta de disponibilidad por fecha/sucursal.
- **REQ-BOK-02**: Creación de cita en estado `PENDING_PAYMENT`.
- **REQ-BOK-03**: Validación de términos y condiciones aceptados.
> **💡 Guía para Prompt**: "Implementa la lógica de búsqueda de slots disponibles cruzando WorkSchedule y citas AUTHORIZED existentes."

### Módulo 05: Servicios y Agenda (SER) - PRIORIDAD: MEDIA
- **REQ-SER-01**: Catálogo de servicios con carga de imágenes.
- **REQ-SER-02**: Configuración de horarios por día de la semana.
- **REQ-SER-03**: Registro de días no laborables (Excepciones).

### Módulo 06: Pagos y Notificaciones (PAY) - PRIORIDAD: MEDIA
- **REQ-PAY-01**: Integración de RabbitMQ para el evento `appointment.created`.
- **REQ-PAY-02**: Worker: Generación de link de pago en Redis con TTL de 24h.
- **REQ-PAY-03**: Portal de carga de comprobantes (Imagen/PDF).

### Módulo 07: Administración y Control SaaS (ADM) - PRIORIDAD: MEDIA
**Meta**: Proveer herramientas de gestión maestra para el SuperAdmin y analítica para el Tenant.

- **REQ-ADM-01**: Centro de Control SuperAdmin (Gestión de Paquetes Híbridos y Configuración Global).
- **REQ-ADM-02**: Panel de Analítica del Tenant (Métricas filtradas por sucursal y fecha).
- **REQ-ADM-03**: Motor de Bloqueo de Funciones (Basado en el JSON de permisos de la suscripción).
- **REQ-ADM-04**: Sistema de Aplicación de Límites Cuantitativos (Ej: Máximo 5 servicios en Plan Básico).
- **REQ-ADM-05**: Listados Operativos con Filtros Avanzados (Paginación, Búsqueda y Estatus).

---

> [!TIP]
> **Punto de Partida Recomendado**: Iniciar simultáneamente con **REQ-INF-01** a **REQ-INF-03** para habilitar el resto de los módulos que dependen de la persistencia de datos.
