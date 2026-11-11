# Prompt: REQ-SER-02 - Carga Masiva de Servicios (CSV Import/Export)

**Objetivo**: Implementar la funcionalidad de importación masiva para que los Tenants puedan cargar su catálogo completo mediante un archivo **CSV**, incluyendo la descarga de una plantilla de ejemplo.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-backend/src/modules/services/`

---

## 🛠️ Instrucciones de Ejecución

Implementa los endpoints de descarga e importación masiva.

### 1. Descarga de Plantilla (`GET /services/template`)
- Genera un archivo CSV al vuelo con las siguientes columnas:
    - `Nombre`, `Descripción`, `TipoPrecio` (FIXED/VARIABLE), `MontoPrecio`.
- Incluye una fila de ejemplo:
    - `Corte de Cabello`, `Servicio básico para caballero`, `FIXED`, `250.00`.
- Retorna el archivo con el nombre `plantilla-servicios.csv`.

### 2. Importación Masiva (`POST /services/import`)
- Utiliza la librería `csv-parser` para procesar el archivo.
- **Validación Fila a Fila**:
    - Cada fila debe validar los campos mediante un DTO interno.
    - Captura errores por fila (ej: "Error en fila 3: MontoPrecio debe ser un número") y repórtalos al final.
- **Persistencia en Lote (Batch)**:
    - Inserta todos los registros válidos vinculados al `tenantId` del usuario logueado en una sola transacción o lote de Prisma.

### 3. Controlador de Servicios (`services.controller.ts`)
- Añade los dos nuevos endpoints protegidos por `JwtAuthGuard`.

---

## 📖 Contexto de Soporte
- Consulta el documento de **Estructura del Código (07)** para asegurar que el procesamiento de archivos se realice de forma eficiente sin bloquear el hilo principal.

**¿Se ha implementado la carga masiva y la descarga de plantilla correctamente?**
