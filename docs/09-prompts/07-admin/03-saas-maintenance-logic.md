# Prompt: REQ-ADM-03 - Lógica de Mantenimiento y Banner Global

**Objetivo**: Implementar una capa de control global en el backend de **NestJS** que permita al SuperAdmin activar el modo mantenimiento o mostrar banners informativos dinámicos en todo el sistema.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-backend/src/common/guards/maintenance.guard.ts` y/o Interceptores globales.

---

## 🛠️ Instrucciones de Ejecución

Genera la lógica de control para el estado del SaaS.

### 1. Servicio de Configuración Maestro (`GlobalSettingsService`)
- Implementa `isMaintenanceMode()`: Consulta el valor en `GlobalSettings` (Prisma).
- Implementa `getMaintenanceBanner()`: Retorna el texto del banner configurado.

### 2. Guardia de Mantenimiento Global (`MaintenanceGuard`)
- Debe interceptar las peticiones a endpoints públicos y operativos.
- Si `maintenanceMode` es `true`:
    - Lanza una `ServiceUnavailableException (503)` con el mensaje personalizado del banner.
- **Excepción**: El rol `SUPERADMIN` debe poder saltarse esta guardia para realizar pruebas.

### 3. Inyección en el Cliente (Next.js)
- Provee un endpoint `GET /config/public` que retorne el estado del mantenimiento para que el front-office pueda mostrar una pantalla de "En construcción" o el banner informativo.

---

## 📖 Contexto de Soporte
- La gestión del mantenimiento se realiza desde la tabla `GlobalSettings` configurada en el paso REQ-ADM-01.

**¿Se ha implementado el bloqueo por mantenimiento y la lógica de banners correctamente?**
