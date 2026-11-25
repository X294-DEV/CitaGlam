import type { ApiErrorResponse } from "@cgbg/shared-types";

/** Mensaje legible para una respuesta HTTP fallida del backend. */
export async function readApiError(res: Response, fallback: string): Promise<string> {
  if (res.status === 429) {
    return "Hiciste demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  }
  try {
    const body = (await res.json()) as Partial<ApiErrorResponse>;
    if (Array.isArray(body.message)) return body.message.join(" ");
    return body.message || fallback;
  } catch {
    return fallback;
  }
}
