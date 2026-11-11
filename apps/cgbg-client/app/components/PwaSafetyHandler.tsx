'use client';

import { useEffect } from 'react';

/**
 * PwaSafetyHandler
 * 
 * Este componente asegura que cualquier Service Worker mal configurado o ciclado
 * no impida la hidratación de la aplicación en modo desarrollo o ante fallos críticos.
 * Implementa una lógica similar a la de Angular main.ts para auto-sanación.
 */
export default function PwaSafetyHandler() {
  useEffect(() => {
    const isDev = process.env.NODE_ENV === 'development';

    if ('serviceWorker' in navigator) {
      if (isDev) {
        // En desarrollo, limpiamos cualquier worker remanente que pueda interferir con el HMR o la carga local
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            console.warn('[PWA] DevMode: Eliminando Service Worker para prevenir conflictos de entorno.', registration);
            registration.unregister();
          }
        });
      }

      // Handler para errores de carga o errores de hidratación globales que Next.js capture
      const errorHandler = (event: ErrorEvent) => {
        // Si hay un error fatal antes de que pase X tiempo, sospechamos del worker
        console.error('[PWA Safety] Error fatal detectado. Limpiando cache del SW...', event.error);
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach(reg => reg.unregister());
        });
      };

      window.addEventListener('error', errorHandler);
      return () => window.removeEventListener('error', errorHandler);
    }
  }, []);

  return null; // Este componente no renderiza nada en la UI
}
