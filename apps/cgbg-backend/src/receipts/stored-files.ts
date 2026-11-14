import {
  applyDecorators,
  BadRequestException,
  Header,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from 'fs';
import { basename, join } from 'path';

/**
 * Archivos privados subidos por usuarios (comprobantes de pago y de suscripción).
 * Viven fuera de cualquier carpeta estática y solo se entregan desde endpoints
 * autenticados que comprueban el dueño del archivo.
 */
export type StoredFolder = 'receipts' | 'proofs';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const UPLOAD_ROOT = join(process.cwd(), 'apps', 'cgbg-backend', 'uploads');

interface DetectedType {
  ext: 'jpg' | 'png' | 'pdf';
  mime: 'image/jpeg' | 'image/png' | 'application/pdf';
}

const SIGNATURES: Array<{ bytes: number[]; type: DetectedType }> = [
  { bytes: [0xff, 0xd8, 0xff], type: { ext: 'jpg', mime: 'image/jpeg' } },
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], type: { ext: 'png', mime: 'image/png' } },
  { bytes: [0x25, 0x50, 0x44, 0x46, 0x2d], type: { ext: 'pdf', mime: 'application/pdf' } }, // %PDF-
];

/** Tipo real del archivo según sus primeros bytes. Ignora nombre y mimetype del cliente. */
export function detectFileType(buffer: Buffer | undefined): DetectedType | null {
  if (!buffer) return null;
  const match = SIGNATURES.find(({ bytes }) =>
    buffer.length >= bytes.length && bytes.every((byte, index) => buffer[index] === byte),
  );
  return match ? match.type : null;
}

export function folderPath(folder: StoredFolder): string {
  const dir = join(UPLOAD_ROOT, folder);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Valida y guarda un archivo subido. El nombre y la extensión los genera el
 * servidor. Devuelve la ruta interna (`receipts/<archivo>`), que es lo que se
 * guarda en la base de datos; no es una URL pública.
 */
export function saveUploadedFile(folder: StoredFolder, prefix: string, file: Express.Multer.File | undefined): string {
  if (!file?.buffer) throw new BadRequestException('El archivo es obligatorio.');
  if (file.size > MAX_UPLOAD_BYTES || file.buffer.length > MAX_UPLOAD_BYTES) {
    throw new BadRequestException('El archivo no debe superar 5MB.');
  }
  const type = detectFileType(file.buffer);
  if (!type) throw new BadRequestException('Solo se permiten archivos JPG, PNG o PDF.');

  const safePrefix = prefix.replace(/[^A-Za-z0-9-]/g, '');
  const fileName = `${safePrefix}-${Date.now()}-${randomUUID()}.${type.ext}`;
  writeFileSync(join(folderPath(folder), fileName), file.buffer);
  return `${folder}/${fileName}`;
}

/**
 * ¿El valor podría resolverse a un archivo privado? Es cierto si algún segmento
 * de la ruta es `receipts` o `proofs` (formato nuevo, el antiguo `/uploads/...` o
 * variantes con `./`). Sirve para rechazar rutas internas enviadas por clientes.
 */
export function isStoredFileReference(value: string | null | undefined): boolean {
  if (!value) return false;
  return /(^|\/)(receipts|proofs)\//i.test(value.trim().replace(/\\/g, '/'));
}

/**
 * Convierte la ruta guardada en base de datos en la ruta absoluta del archivo.
 * Acepta `receipts/x.png` y el formato antiguo `/uploads/receipts/x.png`. Solo usa
 * el nombre del archivo, así que no puede salir de la carpeta indicada.
 */
export function resolveStoredFile(folder: StoredFolder, storedPath: string | null | undefined): string | null {
  if (!storedPath) return null;
  const normalized = storedPath.trim().replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  const name = basename(normalized);
  if (segments.length < 2 || segments[segments.length - 2] !== folder) return null;
  if (!/^[A-Za-z0-9._-]+$/.test(name) || name.startsWith('.')) return null;
  const absolute = join(UPLOAD_ROOT, folder, name);
  return existsSync(absolute) ? absolute : null;
}

function readHead(absolutePath: string): Buffer {
  const fd = openSync(absolutePath, 'r');
  try {
    const head = Buffer.alloc(16);
    const read = readSync(fd, head, 0, head.length, 0);
    return head.subarray(0, read);
  } finally {
    closeSync(fd);
  }
}

/**
 * Entrega un archivo privado. El tipo se vuelve a detectar por bytes; si no es
 * JPG/PNG/PDF (archivos antiguos) se entrega como descarga genérica.
 * Usar junto con `@PrivateFileHeaders()` en el controlador.
 */
export function streamStoredFile(absolutePath: string | null, downloadName: string): StreamableFile {
  if (!absolutePath) throw new NotFoundException('Comprobante no encontrado.');
  const type = detectFileType(readHead(absolutePath));
  const safeName = downloadName.replace(/[^A-Za-z0-9-]/g, '');
  return new StreamableFile(readFileSync(absolutePath), {
    type: type?.mime ?? 'application/octet-stream',
    disposition: type
      ? `inline; filename="${safeName}.${type.ext}"`
      : `attachment; filename="${safeName}"`,
  });
}

/** Cabeceras para endpoints que entregan archivos privados. */
export const PrivateFileHeaders = () =>
  applyDecorators(
    Header('X-Content-Type-Options', 'nosniff'),
    Header('Cache-Control', 'private, no-store'),
  );
