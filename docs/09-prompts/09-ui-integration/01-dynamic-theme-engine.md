# Prompt: REQ-UI-01 - Motor de Temas Dinámicos (Tailwind Variable Injection)

**Objetivo**: Implementar el sistema de inyección de estilos para que el sitio de Next.js cambie su estética (colores, fuentes, logos) basándose en la configuración del campo **JSONB** (`customConfig`) de cada Tenant.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-client/src/components/providers/theme-injector.tsx`

---

## 🛠️ Instrucciones de Ejecución

Implementa el proveedor de temas dinámicos.

### 1. Obtención de Configuración (`Server-Side`)
- Al cargar la página principal del Tenant (`/[slug]`), realiza un fetch al API del backend para obtener el `TenantConfig`.
- Extrae el objeto `customConfig` (JSONB).

### 2. Inyección de Variables CSS
- Crea un componente `ThemeInjector` que reciba el objeto de configuración.
- Genera un bloque de estilos `<style>` embebido en el `<head>` que defina variables de root:
```css
:root {
  --primary-color: ${config.primaryColor};
  --secondary-color: ${config.secondaryColor};
  --logo-url: url('${config.logoUrl}');
  --banner-font: ${config.fontFamily};
}
```

### 3. Configuración de Tailwind CSS
- Actualiza `tailwind.config.js` para que use estas variables en su extensión de tema:
```javascript
theme: {
  extend: {
    colors: {
      primary: 'var(--primary-color)',
      secondary: 'var(--secondary-color)',
    }
  }
}
```

### 4. Implementación del Logo Dinámico
- Provee un componente `TenantLogo` que use `--logo-url` como fondo o fuente de imagen.

---

## 📖 Contexto de Soporte
- La estética debe permanecer premium sin importar el color elegido.
- Consulta el documento de **Técnico (04)** para la estructura JSONB esperada.

**¿Se ha implementado el motor de temas dinámicos correctamente en Next.js?**
