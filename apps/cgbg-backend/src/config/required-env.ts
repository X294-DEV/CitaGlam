/**
 * Lee una variable de entorno obligatoria. Si falta o está vacía, detiene el
 * arranque con un mensaje claro. No usar valores de respaldo para secretos.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Falta la variable de entorno obligatoria ${name}. Defínela en tu .env (ver .env.example).`,
    );
  }
  return value;
}
