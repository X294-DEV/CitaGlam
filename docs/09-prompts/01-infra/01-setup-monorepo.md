# Prompt: REQ-INF-01 - Inicialización del Monorepo CGBG

**Objetivo**: Crear la estructura física de carpetas y el archivo `package.json` raíz para habilitar un entorno de **Monorepo** utilizando **npm workspaces**.

**Ubicación del Proyecto**: `c:\Users\brayan.novelo\Documents\Genny\CGBG\docs\07-codigo\cgbg-webapp/`

---

## 📝 Instrucciones de Ejecución

Por favor, genera los siguientes archivos y carpetas dentro de la ruta indicada. Asegúrate de mantener la jerarquía exacta definida en los documentos de arquitectura.

### 1. Archivo `package.json` (Raíz del Monorepo)
Crea este archivo en `docs/07-codigo/cgbg-webapp/package.json` con soporte para workspaces:
```json
{
  "name": "cgbg-monorepo",
  "version": "1.0.0",
  "description": "Monorepo para el ecosistema SaaS CGBG",
  "private": true,
  "workspaces": [
    "apps/*",
    "libs/*"
  ],
  "scripts": {
    "dev": "npm run dev --workspaces --if-present",
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present"
  }
}
```

### 2. Estructura de Carpetas (Subdirectorios)
Crea los directorios necesarios (puedes dejarlos vacíos o con un `.gitkeep` por ahora):
- `apps/cgbg-backend/`
- `apps/cgbg-admin/`
- `apps/cgbg-client/`
- `apps/cgbg-worker/`
- `libs/shared-types/`
- `libs/prisma/`
- `libs/assets/`
- `docker/postgres/`
- `docker/rabbitmq/`
- `docker/nginx/`

### 3. Archivo `.gitignore` (Raíz)
Incluye las reglas básicas para Node/TypeScript y lo siguiente:
```text
node_modules/
dist/
.env
.DS_Store
*.log
```

---

## 📖 Contexto de Soporte
- **Arquitectura**: Basada en Monorepo para compartir lógica mediante `libs/`.
- **Ecosistema**: NestJS (API), Angular (Admin), Next.js (Client).

**¿Confirmas que la estructura se ha creado correctamente dentro de `docs/07-codigo/cgbg-webapp/`?**
