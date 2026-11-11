# Prompt: REQ-ADM-05 - Listados y Filtros Avanzados (Paginación y Búsqueda)

**Objetivo**: Implementar la lógica estándar de listado para todos los módulos operativos (Citas, Clientes e Histórico), asegurando una navegación fluida mediante paginación y filtrado dinámico.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-backend/src/common/dto/query-params.dto.ts` y Controladores operativos.

---

## 🛠️ Instrucciones de Ejecución

Implementa el estándar de consultas para los listados del sistema.

### 1. DTO de Consulta Base (`BaseQueryDto`)
- Define el objeto base con validaciones de `class-validator`:
    - `page` (Int, Mín 1).
    - `limit` (Int, Máx 100).
    - `q` (String, Opcional): Búsqueda por texto.
    - `startDate` / `endDate` (ISO Date).
    - `status` (Enum de la entidad correspondiente).

### 2. Implementación de Servicios (Método `findAll`)
- Adapta los métodos de Prisma para recibir este DTO.
- **Acción**:
    1. Calcular el `skip` basado en `page` y `limit`.
    2. Construir el objeto `where` dinámicamente con `contains` (insensible a mayúsculas) si existe `q`.
    3. Retornar el objeto paginado: `{ data: [...], meta: { total, page, ... } }`.

### 3. Endpoints a Impactar
- **GET `/appointments`**: Filtros por sucursal, cliente, rango de fechas y estatus.
- **GET `/customers`**: Filtros por nombre y correo (Estructura CRM).

---

## 📖 Contexto de Soporte
- La paginación previene la sobrecarga del frontend.
- Sigue el estándar de respuesta definido en `docs/04-tecnico/README.md`.

**¿Se ha implementado el sistema de listados y filtros avanzados correctamente?**
