# Prompt: REQ-AUTH-01 - Configuración de AuthModule y Estrategia JWT

**Objetivo**: Implementar el núcleo de autenticación en **NestJS** utilizando **Passport JWT** y **Argon2** para el manejo de credenciales.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-backend/src/modules/auth/`

---

## 🛠️ Instrucciones de Ejecución

Por favor, genera los archivos base para el módulo de autenticación. El sistema debe soportar una política de **Access Token** de corta duración (prefijado en `.env`).

### 1. AuthModule (`auth.module.ts`)
- Importa `PassportModule` y `JwtModule`.
- Configura `JwtModule` inyectando `JWT_SECRET` y `JWT_EXPIRES_IN` desde el `ConfigService`.
- Registra `AuthService` y `JwtStrategy`.

### 2. AuthService (`auth.service.ts`)
- Implementa `validateUser(email, password)`: Compara el hash con **Argon2**.
- Implementa `login(user)`: Genera el **Access Token** incluyendo `id`, `email`, `role` y `tenantId` (si aplica) en el payload.

### 3. JwtStrategy (`jwt.strategy.ts`)
- Extiende de `PassportStrategy(Strategy)`.
- Extrae el token del encabezado `Authorization: Bearer`.
- Valida el payload y retorna los datos del usuario.

### 4. Hash Utility
- Crea una función helper o usa el servicio para `hashPassword(password)` y `comparePassword(password, hash)` usando la librería `argon2`.

---

## 📖 Contexto de Soporte
- **Roles**: Los roles permitidos son `SUPERADMIN`, `TENANT`, `CUSTOMER`.
### 2. Estrategia de Multitenancia y Planes
El `AuthService` debe ser capaz de:
- Al autenticar un `TENANT`, buscar su entidad `Tenant` relacionada.
- Obtener el `SubscriptionPackage` activo y sus objetos `limits` y `features`.
- **JWT Payload**: Incluir `tenantId`, `role`, `packageLimits` y `packageFeatures`.

---

## 📖 Contexto de Soporte
- La base de datos es PostgreSQL + Prisma.
- Los límites y funciones inyectados en el JWT permitirán al Frontend ocultar módulos y al Backend bloquear acciones excedidas.

**¿Se ha configurado la autenticación con soporte para límites de suscripción correctamente?**
