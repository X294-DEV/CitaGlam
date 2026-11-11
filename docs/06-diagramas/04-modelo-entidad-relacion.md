# 04 Modelo Entidad-Relación (ERD)

```mermaid
erDiagram
    %% Módulo de Identidad y CRM
    USER ||--o{ CUSTOMER : "es"
    USER ||--o{ TENANT : "es propietario"
    CUSTOMER ||--o{ APPOINTMENT : "reserva"

    %% Configuración de Soporte
    GLOBAL_SETTINGS
    TEMPLATES ||--o{ TENANT_CONFIG : "usa"
    SUBSCRIPTION_PACKAGES ||--o{ TENANT : "asigna"

    %% El Negocio (Tenant)
    TENANT ||--|| TENANT_CONFIG : "configuración"
    TENANT ||--o{ TENANT_PAYMENT_METHODS : "medios pago"
    TENANT ||--o{ BRANCH : "posee"
    TENANT ||--o{ SERVICE : "ofrece"
    TENANT ||--o{ WORK_SCHEDULE : "horarios"
    TENANT ||--o{ NON_WORKING_DAYS : "días libres"
    TENANT ||--o{ APPOINTMENT : "gestiona"

    %% Relaciones de Servicio
    SERVICE ||--o{ APPOINTMENT : "incluye"

    %% Detalles de Entidades
    USER {
        string id PK
        string email
        string passwordHash
        string role
    }
    TENANT {
        string id PK
        string ownerId FK
        string businessName
        string slugUrl
    }
    APPOINTMENT {
        string id PK
        string tenantId FK
        string customerId FK
        string serviceId FK
        string status
        string receiptUrl
    }
    WORK_SCHEDULE {
        string id PK
        string tenantId FK
        int dayOfWeek
    }
```

---
> [!IMPORTANT]
> Este diagrama incluye las **13 entidades principales** del sistema. Refleja las relaciones lógicas del monorepo y debe mantenerse alineado con el diccionario de datos en `docs/08-base-de-datos/`.
