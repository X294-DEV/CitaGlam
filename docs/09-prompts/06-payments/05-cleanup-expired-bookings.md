# Prompt: REQ-PAY-05 - Worker de Limpieza y Autocancelación (24h)

**Objetivo**: Implementar la lógica automatizada en el **Worker** para cancelar aquellas citas que no recibieron el comprobante de pago dentro de las primeras **24 horas** tras su registro.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-worker/src/jobs/cleanup.service.ts`

---

## 🛠️ Instrucciones de Ejecución

Implementa la limpieza automática de citas expiradas.

### 1. Estrategia de Monitoreo (Opciones)
- **Opción A (Cron Job)**: Un proceso que corre cada 1 hora.
- **Opción B (Redis Keyspace Notifications)**: Reacción inmediata al expirar el token de 24h generado en el paso REQ-PAY-02.
- *Selección Sugerida*: Iniciar con **Cron Job** por simplicidad y robustez inicial.

### 2. Lógica de Cancelación
- Busca en la base de datos `Appointment` donde:
    - `status` es `PENDING_PAYMENT`.
    - `paymentExpiry` < `Date.now()`.
- **Acción**:
    - Cambiar `status` a `CANCELLED`.
    - Registrar log: `[DEBUG] Cita ${id} cancelada automáticamente por falta de pago (24h expirado)`.

### 3. Liberación de Slots
- Asegura que al cancelar la cita, el motor de disponibilidad vuelva a mostrar ese espacio como libre para otros clientes.

---

## 📖 Contexto de Soporte
- La persistencia y el motor de agendamiento dependen de que este proceso mantenga la agenda limpia.
- Consulta el documento de **Técnico (04)** para la coherencia de estados.

**¿Se ha implementado el proceso de limpieza y autocancelación correctamente?**
