# Prompt: REQ-TEN-04 - Configuración de Métodos de Pago Manuales

**Objetivo**: Implementar la gestión de los métodos de pago (Transferencias Bancarias o Pago Local) para que el Tenant pueda informar a sus clientes cómo pagar la reserva.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-backend/src/modules/tenants/`

---

## 🛠️ Instrucciones de Ejecución

Implementa la gestión de métodos de pago.

### 1. DTO de Métodos de Pago (`payment-method.dto.ts`)
- `type`: Enum (TRANSFER, CASH).
- `bankDetails`: JSONB (Banco, CLABE, Nombre del Beneficiario, Instrucciones).
- `isEnabled`: Booleano.

### 2. TenantsService (`tenants.service.ts`) / PaymentsService
- Implementa `setupPaymentMethods(tenantId, paymentData)`:
    - Crea o actualiza la entrada en `TenantPaymentMethods`.
    - Asocia el `tenantId` automáticamente del usuario logueado.
- Implementa `getPaymentMethods(tenantId)`: Lista los métodos activos del negocio.

### 3. TenantsController (`tenants.controller.ts`)
- **GET `/tenants/payments`**: Obtiene lista de métodos habilitados.
- **POST `/tenants/payments`**: Configura nuevo método o actualiza el existente.
- **PATCH `/tenants/payments/:id/toggle`**: Habilita o deshabilita un método.

---

## 📖 Contexto de Soporte
- Consulta el documento de **Técnico (04)** para el flujo de carga de comprobantes.
- El usuario final (Customer) verá estos datos al momento de reservar su cita.

**¿Se ha implementado correctamente el setup de pagos manuales para el Tenant?**
