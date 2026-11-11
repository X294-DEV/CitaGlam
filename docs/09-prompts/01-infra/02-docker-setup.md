# Prompt: REQ-INF-02 - Configuración del Ecosistema Docker (Full Stack)

**Objetivo**: Crear la infraestructura de contenedores necesaria para ejecutar todo el ecosistema **CGBG** (Backend, Admin, Client, Worker y Persistencia) de forma aislada y portátil.

**Ubicación de Archivos**: `docs/07-codigo/cgbg-webapp/docker/` y `docs/07-codigo/cgbg-webapp/docker-compose.yml`.

---

## 🏗️ Instrucciones de Ejecución

### 1. Dockerfiles de Desarrollo (`Dockerfile.dev`)
Genera archivos Dockerfile livianos basados en `node:20-alpine` para cada servicio:
- **cgbg-backend**: Expone puerto 3001. Instalación de NestJS.
- **cgbg-worker**: Ejecución de procesos de fondo.
- **cgbg-admin**: Expone puerto 4200. Servidor de desarrollo Angular.
- **cgbg-client**: Expone puerto 3000. Servidor de desarrollo Next.js.
*Nota*: Todos deben incluir la instalación de `pnpm` o `npm` y montar volúmenes para **Hot Reload**.

### 2. Archivo `docker-compose.yml` Completo
Orquesta los siguientes servicios vinculados en una red interna (`cgbg-network`):
- **Bases de Datos**: Postgres 16, Redis 7 (Caché).
- **Mensajería**: RabbitMQ (Management).
- **Aplicaciones**: Los 4 servicios definidos arriba, configurados para depender de las bases de datos (`depends_on`).

### 3. Conectividad Interna
- Asegura que las variables de entorno (`DATABASE_URL`, etc.) utilicen el nombre de los servicios de Docker (ej: `cgbg-db:5432`) en lugar de `localhost`.

---

## 📖 Contexto de Soporte
- Este diseño elimina la necesidad de tener Node instalado en el Host (Windows).
- El uso de volúmenes asegura que los cambios en el código local se reflejen en los contenedores.

**¿Se ha generado el orquestador Full Stack correctamente?**
