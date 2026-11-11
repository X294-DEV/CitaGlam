# 03 Configuración de Entorno (.env)

El archivo de configuración de entorno es el corazón de la conectividad de tu proyecto. Sigue estos pasos para prepararlo.

---

## 🛠️ Paso 1: Localizar el archivo `.env.example`
Lo encontrarás en la ruta raíz de tu futuro proyecto dentro del monorepo (`docs/07-codigo/cgbg-webapp/`).

## 🛠️ Paso 2: Crear el archivo `.env`
Ejecuta el siguiente comando en la raíz del proyecto para copiar el ejemplo:
```powershell
cp .env.example .env
```

## 🛠️ Paso 3: Configurar tus Variables
Abre el archivo `.env` y asegúrate de que estas variables coincidan con tu configuración local:

### 1. Base de Datos (PostgreSQL)
Reemplaza `USER`, `PASSWORD` y `DBNAME`.
```bash
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/cgbg_db?schema=public"
```

### 2. Mensajería y Caché (Docker)
Deberían funcionar "por defecto" si levantaste las imágenes anteriores.
```bash
REDIS_URL="redis://localhost:6379"
RMQ_URL="amqp://guest:guest@localhost:5672"
```

### 3. Seguridad inicial
Define una semilla de seguridad (puedes usar cualquier cadena al azar).
```bash
JWT_SECRET="CAMBIAR_ESTE_VALOR"
JWT_EXPIRES_IN="1h"
```

---

## 📌 Nota de Seguridad
- El archivo `.env` **nunca debe subirse a Git**.
- Asegúrate de que el `.gitignore` ya esté configurado según el primer prompt de infraestructura.

**¿Has configurado todas tus variables locales correctamente?**
