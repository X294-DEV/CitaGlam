# Prompt: REQ-INF-04 - Configuración de Dev Container (Entorno de Desarrollo Aislado)

**Objetivo**: Configurar el entorno de desarrollo dentro de un contenedor para que **Antigravity** (u otros editores compatibles) se conecten directamente a la versión correcta de Node (v20) sin afectar el Host (Windows).

**Ubicación de Archivos**: `.devcontainer/devcontainer.json` y `.devcontainer/Dockerfile`.

---

## 🏗️ Instrucciones de Ejecución

Genera la carpeta `.devcontainer/` con los siguientes archivos:

### 1. `Dockerfile` (Development)
- Basado en `mcr.microsoft.com/devcontainers/javascript-node:20`.
- **Herramientas**: Instala de forma global `@nestjs/cli`, `@angular/cli` y `prisma`.
- **Persistencia**: Asegura que el usuario `node` tenga permisos en la carpeta del proyecto.

### 2. `devcontainer.json`
- **Nombre**: `CGBG Dev Environment`.
- **Docker Compose**: Debe referenciar al `docker-compose.yml` de la raíz para levantar también las bases de datos (Postgres, Redis, RabbitMQ) automáticamente al iniciar el contenedor.
- **Extensiones (IDs)**:
    - `Prisma.prisma`
    - `Angular.ng-template`
    - `bradlc.vscode-tailwindcss`
- **Ajustes**: Configura el terminal por defecto a `zsh` o `bash`.

---

## 📖 Contexto de Soporte
- Esta configuración permite que al abrir el proyecto, Antigravity detecte el "Dev Container" y ofrezca **"Reopen in Container"**.
- Una vez dentro, los comandos `npm install`, `nest start` u `ng serve` usarán el Node 20 del contenedor.

**¿Se ha generado la configuración de Dev Container correctamente?**
