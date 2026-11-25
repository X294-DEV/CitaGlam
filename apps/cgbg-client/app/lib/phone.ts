/** Países ofrecidos en el formulario. No se infiere el país del navegador. */
export const COUNTRIES = [
  { code: "MX", name: "México", dial: "+52" },
  { code: "US", name: "Estados Unidos", dial: "+1" },
  { code: "CO", name: "Colombia", dial: "+57" },
  { code: "ES", name: "España", dial: "+34" },
  { code: "AR", name: "Argentina", dial: "+54" },
  { code: "CL", name: "Chile", dial: "+56" },
  { code: "PE", name: "Perú", dial: "+51" },
] as const;

/** Mismo formato que valida el backend: "+" y código de país, 2 a 15 dígitos. */
const INTERNATIONAL = /^\+[1-9]\d{1,14}$/;

/**
 * Arma el teléfono internacional. Si el usuario escribe un número que ya
 * empieza con "+", se respeta; si no, se antepone el código del país elegido.
 * Devuelve null si el resultado no tiene el formato esperado.
 */
export function toInternationalPhone(dial: string, input: string): string | null {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  // Sin código de país propio, el número nacional debe tener al menos 7 dígitos.
  if (!trimmed.startsWith("+") && digits.length < 7) return null;
  const phone = trimmed.startsWith("+") ? `+${digits}` : `${dial}${digits}`;
  return INTERNATIONAL.test(phone) ? phone : null;
}
