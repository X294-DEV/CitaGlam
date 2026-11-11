# 01 Pre-requisitos de Software (Entorno Docker-First)

Para evitar conflictos de versiones con tus proyectos actuales (Node 16 / Angular 12), utilizaremos un entorno de desarrollo **completamente aislado** basado en Docker.

---

## 🏗️ Herramientas Mandatorias

### 1. Infraestructura de Contenedores
- **Docker Desktop**: [Descargar aquí](https://www.docker.com/products/docker-desktop/). 
    - **IMPORTANTE**: Debe estar iniciado antes de abrir Antigravity.
- **Extensión Dev Containers**: Asegúrate de tener instalada la funcionalidad de "Dev Containers" en Antigravity para permitir la conexión al contenedor de Node 20.

### 2. Editor de Código (IDE)
- **Antigravity**: Tu entorno de desarrollo potenciado por IA.

---

## 🧩 Herramientas Opcionales (Solo para ejecución local fuera de Docker)
*No se recomienda instalarlas globalmente si tienes otros proyectos que dependan de versiones antiguas.*

- **Node.js**: (v20+ recomendado para este proyecto).
- **NestJS CLI / Angular CLI**: Útiles solo si deseas correr comandos directamente en tu Windows.

---

## 🧩 Extensiones en Antigravity
Estas se instalarán **automáticamente** dentro de tu contenedor de desarrollo:
1.  **Prisma**
2.  **Tailwind CSS IntelliSense**
3.  **Angular Language Service**
4.  **Dev Containers** (Obligatoria para la orquestación)

---

## 📌 Verificación
1. Inicia Docker Desktop.
2. Abre Antigravity.
3. Ejecuta `docker --version`.

**¿Está Docker Desktop iniciado y listo para recibir el contenedor de desarrollo?**
