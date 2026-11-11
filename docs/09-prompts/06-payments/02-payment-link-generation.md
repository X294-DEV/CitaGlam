# Prompt: REQ-PAY-02 - Generación de Link de Pago Temporal (Redis)

**Objetivo**: Implementar la lógica para crear un identificador único y temporal en **Redis** que permita al cliente subir su comprobante de pago en un periodo de **24 horas**.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-worker/src/services/payment-link.service.ts`

---

## 🛠️ Instrucciones de Ejecución

Implementa el servicio de generación de links en el Worker.

### 1. Redis Connection (`RedisModule`)
- Utiliza `@liaoliaots/nestjs-redis` o la librería nativa de `ioredis`.
- Conecta al host y puerto definido en el `.env`.

### 2. Generación del Token (`createLink`)
- Crea un token aleatorio (ej: `uuid` o `nanoid`).
- Almacena en Redis la relación `token -> appointmentId`.
- **Expiración**: Configura un **TTL de 86400 segundos** (24 horas).
- Comando sugerido: `SET EX cgbg:payment:link:<token> <appointmentId> 86400`.

### 3. Simulación de Notificación (Console Log)
- Al finalizar la generación exitosa, imprime en la consola del Worker:
- `[DEBUG] Link de Pago Generado Exitosamente:`
- `URL: https://cgbg-portal.com/upload-receipt/<token>`
- `Vigencia: 24 horas (Expira en UTC: ${expiryDate})`

---

## 📖 Contexto de Soporte
- La URL base de carga de comprobantes debe tomarse de la variable `WEB_URL` del entorno.
- Este proceso es gatillado por el evento `appointment.created` (REQ-PAY-01).

**¿Se ha implementado el servicio de generación de links en Redis correctamente?**
