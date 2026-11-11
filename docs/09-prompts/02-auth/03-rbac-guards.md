# Prompt: REQ-AUTH-03 - Guardias de Roles y RBAC (Role-Based Access Control)

**Objetivo**: Implementar la protección de rutas mediante roles para asegurar que solo usuarios autorizados accedan a los recursos del API de **NestJS**.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-backend/src/common/guards/` y `src/common/decorators/`

---

## 🛠️ Instrucciones de Ejecución

Genera los archivos necesarios para implementar el control de acceso basado en roles.

### 1. Decorador de Roles (`roles.decorator.ts`)
- Utiliza `SetMetadata` para asignar los roles requeridos a un endpoint.
- Exporta una constante `ROLES_KEY = 'roles'`.

### 2. Guardia de Roles (`roles.guard.ts`)
- Implementa `CanActivate`.
- Utiliza el `Reflector` para obtener los roles definidos en el decorador.
- Compara los roles requeridos con el rol presente en `request.user` (inyectado por el JWT).
- Retorna `true` si el usuario tiene permiso, o lanza una `ForbiddenException`.

### 3. Guardia de JWT (`jwt-auth.guard.ts`)
- Extiende de `AuthGuard('jwt')` de Passport.
- Úsala como protección base antes de validar los roles.

### 4. Ejemplo de Aplicación sugerido
Muestra cómo proteger un controlador:
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERADMIN')
@Controller('super-admin')
export class SuperAdminController { ... }
```

---

## 📖 Contexto de Soporte
- Asegura que los nombres de los roles coincidan con el Enum definido en el esquema Prisma (`SUPERADMIN`, `TENANT`, `CUSTOMER`).

**¿Se han generado los guardias de roles correctamente para el backend?**
