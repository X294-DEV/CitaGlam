# Prompt: REQ-FRO-01 - Inicialización de Admin Dashboard (Angular + Tailwind)

**Objetivo**: Inicializar la aplicación administrativa para los Tenants y SuperAdmin utilizando **Angular (v17+)** con **Tailwind CSS** para un diseño moderno y escalable.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-admin/`

---

## 🛠️ Instrucciones de Ejecución

Sigue estos pasos para configurar el esqueleto funcional del panel de administración.

### 1. Inicialización y Configuración
- Crea la aplicación Angular en el directorio `apps/cgbg-admin/`.
- **Estándar**: Configura **Tailwind CSS** mediante `tailwind.config.js` y `postcss.config.js`.
- Instala dependencias para componentes UI (ej: `@angular/material` o una librería de iconos premium como `Lucide`).

### 2. Estructura de Carpetas
- **CoreModule**: Para servicios únicos (Auth, Interceptores, State Management).
- **SharedModule**: Para componentes reutilizables (Botones, Tablas, Modales).
- **Features/**: Directorios por módulo funcional (Auth, Tenants, Bookings, Services).

### 3. Shell y Layout Principal (Permisos & Filtros)
- **Sidebar Reactivo**: Debe ocultar automáticamente los módulos (`Analytics`, `Payments`, `Services`) si la característica correspondiente en el JWT (`packageFeatures`) es `false`.
- **SharedModule**: Implementa componentes reutilizables de **Filtrado y Búsqueda**:
    - `SearchBarComponent`: Emite eventos de búsqueda con debounce.
    - `DateRangePickerComponent`: Integra calendarios de inicio y fin.
    - `PaginationComponent`: Controla el cambio de página y límite.

### 4. Integración con el API (Filtros Avanzados)
- Implementa interceptores para adjuntar el `tenantId` automáticamente.
- El `BaseApiService` debe soportar el mapeo de `BaseQueryDto` hacia los parámetros de la URL.

---

## 📖 Contexto de Soporte
- La estética debe ser **Premium/SaaS** con Tailwind CSS.
- Si una funcionalidad está bloqueada por el plan, muestra un **"Upgrade Banner"** en lugar de simplemente ocultar el módulo (opcional, según diseño).

**¿Se ha configurado la aplicación de administración con soporte para permisos y filtros correctamente?**
