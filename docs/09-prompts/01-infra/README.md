# 01 Infraestructura

# 🏗️ Prompts de Infraestructura y Setup Base

Este directorio contiene las instrucciones para inicializar el entorno técnico del proyecto **CGBG** dentro de la carpeta `docs/07-codigo/cgbg-webapp/`.

---

## 📋 Lista de Prompts (Ejecución Secuencial)

1.  **[01. Setup Monorepo](./01-setup-monorepo.md)**: 
    - Crea el `package.json` raíz con npm workspaces.
    - Genera la estructura física de carpetas (`apps/`, `libs/`, `docker/`).
2.  **[02. Configuración Docker](./02-docker-setup.md)**:
    - Genera el archivo `docker-compose.yml` (Postgres, Redis, RabbitMQ).
    - Crea el archivo `.env.example` con las variables de conexión.
3.  **[03. Esquema Prisma](./03-prisma-schema.md)**:
    - Implementa el archivo `schema.prisma` con las **13 entidades** principales.
    - Define las relaciones y los índices de multitenancia.

---

> [!IMPORTANT]
> **Orden de Ejecución**: Es vital seguir el orden numérico (01 -> 02 -> 03) para asegurar que las dependencias de archivos y directorios se respeten.
