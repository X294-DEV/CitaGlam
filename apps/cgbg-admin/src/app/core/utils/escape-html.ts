/**
 * Escapa texto de usuario antes de meterlo en una cadena HTML (por ejemplo en `html:` de SweetAlert2).
 * Convierte `& < > " '` en entidades, de modo que un nombre como `<img src=x onerror=alert(1)>`
 * se muestre como texto y no se ejecute. Sirve para contenido de elementos y para valores
 * de atributos entre comillas simples o dobles.
 *
 * Si se puede, es mejor no armar HTML con cadenas: usar `text:`/`titleText:` de SweetAlert2
 * o los bindings de Angular, que ya escapan.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
