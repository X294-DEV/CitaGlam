# Duración y exclusión — #32

Depende de #31/Timestamptz. PostgreSQL requiere permiso para instalar btree_gist; en el despliegue debe habilitarlo el administrador si la cuenta de migraciones no lo permite.

La restricción manual appointment_no_overlap impide traslapes de rangos [inicio,fin) de la misma sucursal en PENDING_PAYMENT, WAITING_APPROVAL y AUTHORIZED. Canceladas no bloquean; dos rangos adyacentes son válidos. Se agrega un CHECK que exige fin mayor al inicio. Si los datos existentes tienen traslapes/intervalos inválidos, la migración revierte; resolverlos con el humano y un respaldo, sin cancelar ni mover citas automáticamente. Prisma no expresa esta exclusión en schema.prisma: conservar el SQL manual en futuras migraciones.

La duración real se usa en nuevas reservas y reprogramaciones; los intervalos históricos guardados se conservan. El servidor calcula el fin y no acepta endTime del navegador. Los inicios avanzan por durationMin desde la apertura de cada turno, decisión confirmada por Aioria el 23-nov-2026. No se generan rangos que crucen cierres, ocupaciones ni excepciones; el cálculo considera ocupaciones iniciadas el día anterior. Un servicio con duración no positiva se rechaza.

La consulta previa no es garantía de reserva; SQL es la autoridad ante concurrencia. La violación de la exclusión se traduce a 409 sin detalles de base de datos. La reprogramación excluye solo su propia cita al consultar, no las demás.

Prueba: `node --env-file=.env --test apps/cgbg-backend/test/duration.security.cjs`. Usa base temporal y API real; prueba duración 30/90, dos reservas simultáneas (una 201, otra 409), SQL directo, cancelación, intervalos adyacentes, medianoche y excepciones.
