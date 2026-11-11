# Prompt: REQ-UI-02 - Formulario de Reserva Interactivo (Calendario de 1h)

**Objetivo**: Implementar el calendario de selección de citas en el sitio público (Next.js), asegurando una experiencia de usuario fluida y validando la disponibilidad en tiempo real.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-client/src/components/booking/booking-form.tsx`

---

## 🛠️ Instrucciones de Ejecución

Implementa el formulario de reserva con selección de slots de 1h.

### 1. Selector de Fecha y Sucursal
- Carga las sucursales del Tenant mediante el API.
- Implementa un calendario simple para seleccionar el día de la cita.

### 2. Grid de Disponibilidad (Slots de 1h)
- Al seleccionar una fecha y sucursal, realiza un fetch a `/bookings/availability` (REQ-BOK-02).
- Renderiza una cuadrícula (grid) con las horas disponibles (ej: 09:00, 10:00, 11:00...).
- **Estilo**: Resalta en color `primary` (Tailwind) el slot seleccionado.

### 3. Formulario de Datos del Cliente
- Campos: `Nombre`, `Correo`, `Teléfono`.
- Checkbox de aceptación de términos y condiciones (Obligatorio).

### 4. Envío de Reserva (`POST /appointments`)
- Al confirmar, llama al endpoint de creación de cita (REQ-BOK-03).
- Tras el éxito, redirige a una **Pantalla de Confirmación** que muestre:
    - Resumen de la cita (UTC con conversión local).
    - Instrucciones de pago.
    - Mensaje indicando que el link de carga de comprobante llegará en 24h.

---

## 📖 Contexto de Soporte
- La estética debe ser responsiva y móvil-primero.
- Los horarios deben mostrarse en la hora local (México/Guadalajara) utilizando el `DateHelper`.

**¿Se ha implementado el calendario interactivo de reserva correctamente en Next.js?**
