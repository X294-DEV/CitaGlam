# 02 Ejecución en Entorno Aislado (Dev Containers)

Para garantizar la coherencia y evitar conflictos con tu Node 16 local, ejecutaremos todo el desarrollo **dentro de un contenedor de Node 20**.

---

## 🚀 Paso 1: Abrir en Contenedor
Al abrir la carpeta de este proyecto en **Antigravity**, el editor detectará la carpeta `.devcontainer/` y te mostrará una notificación:
> **"Reabrir en Contenedor"**

Haz clic en ella. Antigravity descargará las imágenes y configurará tu entorno de Node 20 automáticamente.

## 🚀 Paso 2: Levantar Infraestructura Completa
Una vez que el editor se haya reiniciado dentro del contenedor, abre una terminal interna y ejecuta:
```bash
docker-compose up -d
```
*Esto levantará el Backend, Frontend, Worker, Postgres, Redis y RabbitMQ simultáneamente.*

## 🚀 Paso 3: Puertos de Desarrollo
El contenedor mapeará automáticamente los puertos para que los veas en tu navegador de Windows:
- **3000**: Front Office (Next.js)
- **4200**: Dashboard Admin (Angular)
- **3001**: API Backend (NestJS)

---

## 📌 Diferencia entre Local (Windows) y Contenedor
- **Local**: Node 16 / Angular 12 (Tus otros proyectos permanecen intactos).
- **Contenedor**: Node 20 / Angular 17 / NestJS (Este proyecto corre aquí de forma aislada).

**¿Has logrado abrir el proyecto en el Dev Container de Antigravity?**
