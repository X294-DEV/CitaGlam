/**
 * Límites de peticiones por IP (ventana de 1 minuto), para @nestjs/throttler.
 * Cambiar un valor aquí lo cambia en todos los endpoints que lo usan.
 */
const MINUTE = 60_000;

export const GLOBAL_RATE_LIMIT = { ttl: MINUTE, limit: 300 };

export const RATE_LIMITS = {
  /** POST /appointments/public: evita apartar horarios en bucle. */
  publicBooking: { default: { ttl: MINUTE, limit: 10 } },
  /** Login, registro y recuperación de contraseña: frena fuerza bruta. */
  authSensitive: { default: { ttl: MINUTE, limit: 5 } },
  login: { default: { ttl: MINUTE, limit: 10 } },
  /** Consultas públicas que revelan si un correo o token existe. */
  enumeration: { default: { ttl: MINUTE, limit: 20 } },
  /** Subida de archivos desde endpoints públicos. */
  publicUpload: { default: { ttl: MINUTE, limit: 10 } },
};
