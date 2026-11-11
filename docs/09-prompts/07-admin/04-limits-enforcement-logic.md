# Prompt: REQ-ADM-04 - Lógica de Aplicación de Límites (Enforcement)

**Objetivo**: Implementar una capa de seguridad en el backend que valide los límites cuantitativos del paquete de suscripción del Tenant antes de permitir la creación de nuevos recursos (Servicios, Sucursales, Clientes).

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-backend/src/common/guards/subscription-limit.guard.ts`

---

## 🛠️ Instrucciones de Ejecución

Genera la lógica de validación de cuotas.

### 1. Interceptor de Cuotas (`SubscriptionLimitInterceptor`)
- Crea un interceptor que pueda aplicarse en los métodos `POST`.
- **Lógica**:
    1. Obtiene los `packageLimits` del JWT del usuario.
    2. Cuenta los registros actuales en la tabla correspondiente (ej: `prisma.service.count({ where: { tenantId } })`).
    3. Si el conteo es mayor o igual al límite permitido en el JSON de la suscripción:
       - Lanza una `ForbiddenException (403)` con el mensaje: `Límite de plan excedido (${limit}). Por favor, mejora tu plan.`

### 2. Decoradores Personalizados
- Implementa un decorador `@CheckLimit('maxServices')` para usarlo fácilmente en los controladores.

### 3. Excepciones
- Si el límite en el JSON es `null`, se considera **Ilimitado**.

---

## 📖 Contexto de Soporte
- Esta protección es vital para evitar inserciones masivas en el Plan Básico ($199).
- Revisa el archivo `08-base-de-datos/README.md` para la estructura de los límites.

**¿Se ha implementado el control de límites de suscripción correctamente?**
