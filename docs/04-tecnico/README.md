# 04 Técnico

# 🛠️ Documento Técnico Detallado: SaaS CGBG (v1.0)

Este documento proporciona las especificaciones de implementación para los desarrolladores del ecosistema **CGBG**.

---

## 1. Estándares de API y Comunicación

El Backend (NestJS + Fastify) debe seguir estas normas:

### 1.1. Cabeceras Obligatorias
- `x-tenant-id`: UUID del Tenant para identificar el contexto de la petición.
- `Authorization`: Bearer Token (JWT) para peticiones autenticadas.

### 1.2. Manejo de Errores
Se debe implementar un `GlobalExceptionFilter` que devuelva un JSON con la siguiente estructura:
```json
{
  "statusCode": 400,
  "message": "Descripción del error",
  "error": "Bad Request",
  "timestamp": "2024-04-04T00:00:00.000Z",
  "path": "/api/v1/resource"
}
```

---

## 2. Flujo Técnico: Carga de Comprobantes

Debido a que no se utilizan pasarelas de pago automáticas, el proceso se basa en la validación manual de evidencias.

### 2.1. Generación de Link de Pago (Lógica del Worker)
1.  **Evento**: Al crear una cita (`PENDING_PAYMENT`), el API publica un evento en RabbitMQ.
2.  **Worker**: El Worker genera un token único asociado a la cita y lo guarda en **Redis** con un TTL (Time To Live) de 24 horas (configurable por Tenant).
3.  **Notificación**: Se envía un WhatsApp al cliente con la URL: `cgbg.com/pay/{token}`.

### 2.2. Proceso de Carga (Client Office)
- El endpoint `/api/appointments/upload-receipt` recibirá un `multipart/form-data`.
- **Validaciones**: 
    - El token en la URL debe existir en Redis.
    - Extensión: `.jpg`, `.png`, `.pdf`.
    - Tamaño máximo: 5MB.
- **Almacenamiento**: Los archivos se suben a un bucket de S3 o almacenamiento local organizado por `tenantId/year/month/file`.

### 2.3. DTO de Carga (NestJS Snippet)
```typescript
export class UploadReceiptDto {
  @IsUUID()
  appointmentId: string;

  @IsString()
  token: string; // Token de validación de Redis

  @IsNotEmpty()
  receiptFile: any; // Validado por el interceptor de Fastify/Nest
}
```

---

## 3. Modelado de Datos y Persistencia

El sistema se compone de **13 entidades principales** que cubren desde la identidad y configuración global hasta la operación operativa de los Tenants. La especificación completa de estas tablas y su diccionario se encuentra en `docs/08-base-de-datos/`.

### 3.1. Prisma Schema (Multitenant Core)
Fragmento del esquema que asegura el aislamiento:
```prisma
model Appointment {
  id            String            @id @default(uuid())
  tenantId      String
  tenant        Tenant            @relation(fields: [tenantId], references: [id])
  status        AppointmentStatus @default(PENDING_PAYMENT)
  receiptUrl    String?
  paymentExpiry DateTime
  // ... resto de campos
  
  @@index([tenantId]) // Índice crítico para performance SaaS
}

enum AppointmentStatus {
  PENDING_PAYMENT
  WAITING_APPROVAL
  AUTHORIZED
  COMPLETED
  CANCELLED
}
```

### 3.2. `TenantConfig.customConfig` (JSONB)
Define la apariencia del sitio OnePage.
```json
{
  "theme": {
    "primaryColor": "#2C3E50",
    "secondaryColor": "#E74C3C",
    "fontFamily": "Inter"
  },
  "assets": {
    "logoWeb": "https://storage.cgbg.com/logos/tenant-1.png",
    "favicon": "https://storage.cgbg.com/icons/tenant-1.ico"
  },
  "features": {
    "showPrices": true,
    "allowCancellations": false
  }
}
```

---

## 4. Definición de Mensajería (RabbitMQ)

### 4.1. Exchanges y Routing Keys
| Exchange | Routing Key | Descripción |
| :--- | :--- | :--- |
| `cgbg.appointments` | `created` | Nueva cita solicitada. |
| `cgbg.appointments` | `status.updated` | Cambio de estatus (ej: WAITING -> AUTHORIZED). |
| `cgbg.notifications` | `whatsapp.send` | Orden directa para enviar mensaje. |

### 4.2. Ejemplo de Payload (Evento: `appointment.created`)
```typescript
export interface IAppointmentCreatedPayload {
  appointmentId: string;
  tenantId: string;
  customerPhone: string;
  expiresAt: Date; 
  paymentUrl: string; // Link con token de Redis
}

export interface IStatusUpdatedPayload {
  appointmentId: string;
  newStatus: 'WAITING_APPROVAL' | 'AUTHORIZED';
  tenantId: string;
}
```

---

## 5. Configuración de Entorno (.env)

| Variable | Descripción |
| :--- | :--- |
| `DATABASE_URL` | String de conexión a PostgreSQL. |
| `REDIS_URL` | Conexión para cache y vigencia de tokens. |
| `RABBITMQ_URL` | Broker para tareas en segundo plano. |
| `JWT_SECRET` | Llave para firma de tokens. |
| `UPLOAD_STRATEGY` | `LOCAL` or `S3`. |
| `PAYMENT_LINK_TTL` | Tiempo de vigencia en segundos (Default: 86400). |

---

## 6. Estándares de DTO para Listados y Reportes

Todos los módulos de consulta deben implementar el siguiente patrón de DTO para asegurar la coherencia en los filtros y la paginación.

### 6.1. DTO de Consulta Base (`BaseQueryDto`)
```typescript
export class BaseQueryDto {
  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  page?: number = 1;

  @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number)
  limit?: number = 10;

  @IsOptional() @IsString()
  q?: string; // Búsqueda por texto (query)

  @IsOptional() @IsISO8601()
  startDate?: string;

  @IsOptional() @IsISO8601()
  endDate?: string;

  @IsOptional() @IsEnum(StatusEnum)
  status?: string;
}
```

### 6.2. Implementación de Respuesta Paginada
```json
{
  "data": [...],
  "meta": {
    "total": 150,
    "page": 1,
    "lastPage": 15,
    "limit": 10
  }
}
```

---

> [!CAUTION]
> Es crítico asegurar que el middleware de multitenancy esté activo en todos los módulos para evitar que un Tenant pueda ver datos de otro mediante manipulación de IDs en los filtros.
