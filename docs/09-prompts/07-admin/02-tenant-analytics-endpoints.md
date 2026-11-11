# Prompt: REQ-ADM-02 - Analítica y Métricas del Negocio (Tenant)

**Objetivo**: Implementar los endpoints de reporte y estadísticas para que el Tenant pueda monitorear el desempeño de su negocio y fidelizar a sus mejores clientes.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-backend/src/modules/tenants/stats.controller.ts`

---

## 🛠️ Instrucciones de Ejecución

Implementa el servicio de analítica utilizando agregaciones de Prisma (`groupBy` y `aggregate`).

### 1. Métricas de Ingresos (`GET /stats/revenue`)
- **Acción**: Suma de `priceAmount` de las citas `COMPLETED`.
- **Filtros (BaseQueryDto)**:
    - `startDate` / `endDate` (ISO 8601).
    - `branchId` (opcional): Filtrar analítica por sucursal específica.

### 2. Panel de Control de Citas (`GET /stats/bookings-summary`)
- Conteo agrupado por `status`.
- Soporta filtros por sucursal y rango de fechas.

### 3. Programa de Fidelidad y Top Clientes (`GET /stats/top-customers`)
- **Acción**: Top 10 clientes con mayor volumen de reservas.
- **Datos Requeridos**: Nombre, Citas Totales, Gasto total.

---

## 📖 Contexto de Soporte
- Acceso restringido al rol `TENANT` o `SUPERADMIN`.
- Se debe validar que la característica `canAccessAnalytics` esté activa en el paquete de suscripción del Tenant (Cerrar acceso si está en Plan Básico).

**¿Se han implementado las métricas de negocio con soporte para filtros correctamente?**
