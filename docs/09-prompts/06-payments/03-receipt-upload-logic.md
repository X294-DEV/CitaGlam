# Prompt: REQ-PAY-03 - Carga de Comprobantes (File Upload)

**Objetivo**: Implementar el punto de entrada para que el cliente final pueda subir su comprobante de pago (JPG/PDF) validando la vigencia del token en **Redis**.

**Ubicación**: `docs/07-codigo/cgbg-webapp/apps/cgbg-backend/src/modules/bookings/receipts.controller.ts`

---

## 🛠️ Instrucciones de Ejecución

Implementa el controlador y servicio de carga de archivos en el Backend.

### 1. Validación del Token (`GET /receipts/validate/:token`)
- Verifica en **Redis** si el token existe y aún no ha expirado.
- Retorna los datos básicos de la cita (`id`, `serviceName`, `amount`) para mostrar al cliente.

### 2. Carga del Archivo (`POST /receipts/upload/:token`)
- Utiliza `FileInterceptor` con **Multer** para recibir el archivo.
- **Configuración Multer**:
    - Tipos permitidos: `image/jpeg`, `image/png`, `application/pdf`.
    - Tamaño máximo: 5MB.
- **Almacenamiento**:
    - Guarda el archivo en `uploads/receipts/` o similar (Estrategia local inicial).

### 3. Actualización de Estatus (Prisma)
- Tras la subida exitosa:
    - Actualiza `Appointment`:
        - `status`: `WAITING_APPROVAL`.
        - `receiptUrl`: Ruta del archivo guardado.
- Borra el token de **Redis** para evitar doble carga.

---

## 📖 Contexto de Soporte
- La persistencia de archivos debe respetar la privacidad del Tenant.
- Consulta el documento de **Técnico (04)** para el flujo de estados.

**¿Se ha implementado la carga de comprobantes y validación de tokens correctamente?**
