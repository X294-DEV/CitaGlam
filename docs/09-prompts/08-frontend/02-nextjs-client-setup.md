# Prompt: REQ-FRO-02 - Inicialización de Front Office (Next.js + Tailwind)

**Objetivo**: Inicializar el sitio público (Front Office) utilizando **Next.js** para un rendimiento óptimo de SEO y una experiencia premium para el cliente final al realizar reservas.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-client/`

---

## 🛠️ Instrucciones de Ejecución

Sigue estos pasos para configurar la aplicación de reservas públicas.

### 1. Inicialización y Configuración
- Crea el proyecto Next.js en `apps/cgbg-client/` usando el **App Router**.
- **Estética**: Configura **Tailwind CSS** con una paleta de colores base elegante.
- Implementa un **Theme Provider** global que inyecte las variables CSS (`--primary`, `--logo-url`, etc.) desde el `customConfig` del Tenant.

### 2. Estructura de Rutas Dinámicas
- **`/[slug]`**: Página de inicio del Tenant (Banner, Servicios, Datos de contacto).
- **`/[slug]/booking`**: Formulario interactivo de reserva (Calendario de 1h).
- **`/[slug]/receipt/<token>`**: Página de carga de comprobantes para el flujo de pago manual.

### 3. Componentes Premium
- Diseña una **Landing Page** elegante basada en la estructura del documento de componentes (05).
- Los componentes deben usar clases de Tailwind basadas en las variables CSS inyectadas para permitir el cambio de colores dinámico.

### 4. Integración con el API de Disponibilidad
- Consume los servicios de `availability.service.ts` (REQ-BOK-02) para mostrar los slots de 1h libres.

---

## 📖 Contexto de Soporte
- La prioridad es el **SEO** y la velocidad de carga.
- Utiliza **Server-Side Rendering (SSR)** para obtener la configuración inicial del Tenant por su `slug`.

**¿Se ha inicializado la aplicación de cliente correctamente con soporte para temas dinámicos?**
