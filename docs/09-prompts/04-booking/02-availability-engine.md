# Prompt: REQ-BOK-02 - Motor de Cálculo de Disponibilidad (Slots de 1h)

**Objetivo**: Implementar la lógica del motor de búsqueda de espacios libres para citas, asegurando que solo se ofrezcan **horas cerradas** (slots de 1h) y se respete la zona horaria de **CDMX / Guadalajara**.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-backend/src/modules/bookings/availability.service.ts`

---

## 🛠️ Instrucciones de Ejecución

Implementa el servicio de disponibilidad siguiendo estas reglas de negocio:

### 1. Entrada de Búsqueda
- **Inputs**: `tenantId`, `branchId`, `serviceId`, `date` (ISO String).

### 2. Algoritmo de Cálculo (Pasos de 1h)
- **Paso A**: Obtener el `WorkSchedule` del día de la semana correspondiente (ej: Lunes: 09:00 - 18:00).
- **Paso B**: Verificar si la fecha está en `NonWorkingDays`. Si es festivo, disponibilidad = `[]`.
- **Paso C**: Generar el array inicial de horas (ej: `[9, 10, 11, ..., 17]`).
- **Paso D**: Consultar `Appointments` existentes para ese día/sucursal que estén en estado `AUTHORIZED` o `PENDING_PAYMENT`.
- **Paso E**: Restar las horas ya ocupadas del array inicial.

### 3. Normalización UTC
- Utiliza el `DateHelper` (REQ-BOK-01) para convertir la fecha de búsqueda a local antes de consultar el día de la semana, y para normalizar las horas de las citas existentes.

---

## 📖 Contexto de Soporte
- La duración mínima y máxima es **estrictamente de 1 hora**.
- Los horarios en la base de datos se guardan como enteros de hora (ej: `startTime: 9`) para facilitar el cálculo de slots cerrados.

**¿Se ha implementado el cálculo de slots de 1h correctamente siguiendo las reglas de zona horaria?**
