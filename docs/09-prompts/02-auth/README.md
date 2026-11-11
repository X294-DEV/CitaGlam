# 02 Identidad y Auth

# 🔐 Prompts de Identidad y Seguridad (RBAC)

Este directorio contiene las instrucciones para implementar el sistema de autenticación y autorización en el backend de **NestJS** dentro de `docs/07-codigo/cgbg-webapp/`.

---

## 📋 Lista de Prompts (Ejecución Secuencial)

1.  **[01. Setup AuthModule](./01-nestjs-auth-setup.md)**: 
    - Configura `Passport JWT` y `JwtModule`.
    - Implementa el hashing de contraseñas con `Argon2`.
2.  **[02. Endpoints y DTOs](./02-auth-endpoints.md)**:
    - Crea los controladores para `login` y `register`.
    - Implementa validaciones de entrada con `class-validator`.
3.  **[03. Guardias RBAC](./03-rbac-guards.md)**:
    - Implementa el decorador `@Roles`.
    - Crea el `RolesGuard` para proteger rutas por rol (`SUPERADMIN`, `TENANT`, `CUSTOMER`).

---

> [!IMPORTANT]
> **Aislamiento Multitenant**: El `AuthService` debe asegurar que el `tenantId` (si existe para el usuario) sea incluido en el payload del Access Token para que los servicios operativos puedan filtrar datos correctamente.
