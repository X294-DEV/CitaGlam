## Issue
Closes #

## Qué cambia
<!-- Resumen corto, en lenguaje claro -->

## Cómo se probó
<!-- Build ejecutado, peticiones reales, capturas si hay interfaz -->

## Lista de seguridad
- [ ] Las consultas filtran por `tenantId` tomado del JWT
- [ ] Los endpoints del panel exigen rol
- [ ] No se devuelven entidades completas de `User` ni campos sensibles
- [ ] No hay secretos, `.env`, logs ni datos reales en el diff
- [ ] No se tocó `schema.prisma` (o es de la pareja 1 y el issue lo pide)

## Fuera de área
<!-- Archivos fuera del área de tu pareja y por qué -->
