# Zona por sucursal — #31

Aioria confirmó el 23-nov-2026 que todas las sucursales existentes usan America/Mexico_City. La migración agrega esa zona como valor inicial/default y convierte los timestamps locales anteriores con AT TIME ZONE de PostgreSQL: 10:00 antiguo se convierte en 16:00Z en noviembre, conservando 10:00 para el negocio.

Solo startTime/endTime de Appointment cambian a Timestamptz(3). paymentExpiry es un vencimiento del reloj del servidor y no se desplaza. WorkException.exceptionDate sigue representando fecha calendario; openTime/closeTime y excepciones horarias se interpretan en la zona de cada sucursal.

Detener las apps, respaldar y aplicar las migraciones con DATABASE_URL del entorno correcto, generar Prisma, compilar y reiniciar el backend. No desplegar frontend antiguo que agregue Z a la hora local: #35/#36 deben consumir instantes reales y date YYYY-MM-DD. Mantener ambas ramas de implementación sincronizadas al integrar #30 y #31, porque ambas modifican Prisma/appointments.

La API rechaza instantes sin zona y fechas calendario inválidas. Muestra/envía fechas de correo en la zona de sucursal y publica timezone en las sucursales públicas. Cambiar timezone posteriormente no modifica los instantes de citas existentes. Los inicios/fin de horario de sucursal se convierten con las reglas IANA de PostgreSQL; los cambios DST siguen esas reglas, no el reloj del navegador.

`node --env-file=.env --test apps/cgbg-backend/test/timezone.security.cjs` prueba una base poblada anterior y HTTP real, en una base temporal creada/eliminada por el propio test. #32 reemplaza el paso provisional de una hora por duración real y rangos de instantes.
