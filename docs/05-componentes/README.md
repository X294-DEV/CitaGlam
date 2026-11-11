# 05 Componentes

# 🧩 Arquitectura de Componentes: SaaS CGBG (v1.0)

Este documento detalla la estructura interna de los módulos, servicios y componentes que conforman el ecosistema **CGBG**.

---

## 1. Gestión Global de Configuración (Zero Hardcoding)

Para garantizar la portabilidad y facilidad de mantenimiento, el sistema prohíbe el uso de rutas fijas (hardcoded URLs) en servicios o componentes. Todas las interconexiones se gestionan mediante variables de entorno.

### 1.1. Variables de Interconectividad
| Variable | Aplicación | Propósito |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Client (Next.js) | Punto de acceso al Backend para reservas. |
| `API_EXTERNAL_URL` | Backend (NestJS) | URL base para generar links de pago en WhatsApp. |
| `ADMIN_PANEL_URL` | Backend (NestJS) | Redirección de correos hacia el panel de Angular. |

### 1.2. Implementación Técnica
- **NestJS**: Uso del `ConfigModule` y `ConfigService` inyectado en todos los módulos de infraestructura.
- **Next.js**: Variables con prefijo `NEXT_PUBLIC_` para ser accesibles en el navegador.

---

## 2. Aplicaciones y sus Módulos Internos

### 🛰️ Backend (`apps/cgbg-backend`)
Basado en módulos desacoplados:
- **AuthModule**: Gestión de JWT, cifrado con Argon2 y guardias de roles (SUPERADMIN/TENANT).
- **TenantsModule**: Lógica de creación de locales y gestión de `TenantConfig` (JSONB).
- **BookingsModule**: Orquestación de citas, validación de slots y lógica de 24h.
- **BillingModule**: Gestión de suscripciones de los Tenants.

### 🛡️ Admin Dashboard (`apps/cgbg-admin`)
Estructura modular de Angular:
- **CoreModule**: Servicios singleton (AuthService, HttpInterceptor).
- **SharedModule**: UI Components (Tablas dinámicas, modales de confirmación).
- **TenantModule**: Dashboard de estadísticas, gestión de servicios y horarios (Lazy Loaded).

---

## 3. Frontend Cliente (`apps/cgbg-client`)

### 3.1. Hooks Personalizados (React)
El flujo de reserva se encapsula en hooks para mantener los componentes visuales limpios:
- **`useBooking`**: Gestiona el estado local del formulario de reserva y la llamada al API.
- **`useTenantConfig`**: Inyecta los colores y logos dinámicos desde el `context`.
- **`useReceiptUpload`**: Maneja la validación de archivos y el estatus de carga en S3/Local.

### 3.2. Template Engine
Componente encargado de inyectar variables CSS dinámicas:
```typescript
const ThemeInjector = ({ config }) => (
  <style jsx global>{`
    :root {
      --primary-color: ${config.theme.primaryColor};
      --secondary-color: ${config.theme.secondaryColor};
    }
  `}</style>
);
```

---

## 4. Worker de Procesamiento (`apps/cgbg-worker`)

Este componente no expone APIs, funciona como un consumidor de RabbitMQ:
- **`NotificationConsumer`**: Listener de eventos para disparo de WhatsApp/Email.
- **`CleanupConsumer`**: Tareas programadas para liberar slots de citas `CANCELLED` por falta de pago.

---

> [!IMPORTANT]
> Cualquier nuevo servicio que requiera comunicarse con un endpoint externo debe declarar su variable de entorno correspondiente en el archivo `.env.example` y ser inyectado mediante el servicio de configuración global.
