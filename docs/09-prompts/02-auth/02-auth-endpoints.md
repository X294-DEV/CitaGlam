# Prompt: REQ-AUTH-02 - Controladores y DTOs de Autenticación

**Objetivo**: Implementar los puntos de entrada (Endpoints) para el registro e inicio de sesión en el backend de **NestJS**.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-backend/src/modules/auth/`

---

## 🛠️ Instrucciones de Ejecución

Genera los archivos del controlador y los objetos de transferencia de datos (DTOs) necesarios.

### 1. DTO de Login (`login.dto.ts`)
- Propiedades: `email` (string, @IsEmail()), `password` (string).

### 2. DTO de Registro (`register.dto.ts`)
- Propiedades:
    - `email`: (@IsEmail() con formato válido).
    - `password`: (@IsString(), @MinLength(8), y @Matches() con Regex de seguridad: al menos 1 mayúscula, 1 minúscula, 1 número y 1 símbolo especial).
    - `role`: (Enum: SUPERADMIN, TENANT, CUSTOMER).
    - `firstName`, `lastName`, `phone`.
- Asegura que el rol sea uno de los permitidos.

#### Ejemplo de Regex para Password (OWASP):
`((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$`

### 3. AuthController (`auth.controller.ts`)
- **POST `/auth/login`**: 
    - Recibe el `LoginDto`.
    - Llama a `authService.login()`.
    - Retorna un objeto `{ accessToken: string }`.
- **POST `/auth/register`**:
    - Recibe el `RegisterDto`.
    - Llama a un servicio (ej: `UsersService`) para crear el usuario.
    - Retorna el objeto del usuario creado (excluyendo la contraseña).

### 4. UsersService (`users.service.ts`)
- Debe interactuar con la librería **Prisma** (`libs/prisma/`) para persistir los datos.
- `create(data)`: Hashea la contraseña antes de guardar.
- `findByEmail(email)`: Retorna un usuario por email para la validación de login.

---

## 📖 Contexto de Soporte
- La base de datos es **PostgreSQL**.
- Usa `libs/prisma/` para todas las operaciones de persistencia.

**¿Se han generado los endpoints de autenticación correctamente?**
