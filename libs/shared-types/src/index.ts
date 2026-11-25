/** Contrato objetivo del Sprint 1; estos tipos NO activan endpoints ni migraciones. */
export type {
  PublicTenantConfigDto, PublicTenantDto, PublicServiceCategoryDto, PublicServiceDto,
} from './public-catalog';
export type UUID = string;
/** Instante ISO con Z u offset explícito. Respuestas normalizadas a UTC/Z. */
export type ISODateTime = string;
/** Fecha YYYY-MM-DD en la zona de la sucursal; no es un instante. */
export type LocalDate = string;
/** Identificador IANA, por ejemplo America/Mexico_City. */
export type TimeZone = string;
/** Decimal serializado como cadena por Prisma. */
export type Money = string;

export interface CustomerInput {
  firstName: string;
  lastName: string;
  email: string;
  /** Teléfono internacional normalizado con +; único dentro del tenant. */
  phone: string;
}
export type CreateCustomerRequest = CustomerInput;
export interface CustomerDto extends CustomerInput {
  id: UUID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
export interface CustomerListItem extends CustomerDto {
  totalSpent: number;
  appointmentsCount: number;
  lastVisit: ISODateTime | null;
}
export interface CustomerDetail extends CustomerListItem {
  appointments: AppointmentDto[];
}

/** Subconjunto de las respuestas de sucursal consumido por ambos frontends. */
export interface BranchDto {
  id: UUID;
  name: string;
  address: string;
  city: string | null;
  phone: string | null;
  timezone: TimeZone;
}
export interface AvailabilityRequest {
  branchId: UUID;
  serviceId: UUID;
  date: LocalDate;
}
export interface AvailabilitySlot {
  startTime: ISODateTime;
  endTime: ISODateTime;
}
export type AvailabilityResponse = AvailabilitySlot[];

export interface CreateAppointmentRequest {
  customerId: UUID;
  branchId: UUID;
  serviceId: UUID;
  startTime: ISODateTime;
  notes?: string;
}
export interface CreatePublicAppointmentRequest {
  slug: string;
  branchId: UUID;
  serviceId: UUID;
  startTime: ISODateTime;
  clientInfo: CustomerInput;
  /** Confirmación expresa en ESTA reserva, nunca dentro de Customer. */
  termsAccepted: true;
  /** Token de Cloudflare Turnstile. Obligatorio si el servidor tiene clave secreta configurada. */
  turnstileToken?: string;
  notes?: string;
}
export interface RescheduleAppointmentRequest {
  newStartTime: ISODateTime;
  reason?: string;
}
export type AppointmentStatus =
  | 'PENDING_PAYMENT' | 'WAITING_APPROVAL' | 'AUTHORIZED' | 'COMPLETED' | 'CANCELLED';
export interface ServiceSummary {
  id: UUID;
  name: string;
  durationMin: number;
  price: Money;
  color: string | null;
}
export interface PaymentSummary {
  id: UUID;
  amount: Money;
  /** Referencia interna, NO URL pública. Descargar con JWT por la ruta de receipts. */
  receiptUrl: string | null;
  isApproved: boolean;
  approvedAt: ISODateTime | null;
}
/** Respuesta del panel; nunca devolverla completa desde la reserva pública. */
export interface AppointmentDto extends AvailabilitySlot {
  id: UUID;
  tenantId: UUID;
  customerId: UUID;
  branchId: UUID;
  serviceId: UUID;
  status: AppointmentStatus;
  notes: string | null;
  paymentExpiry: ISODateTime | null;
  /** Fecha del servidor; null en captura por personal o sin evidencia histórica. */
  termsAcceptedAt: ISODateTime | null;
  customer: CustomerDto;
  branch: BranchDto;
  service: ServiceSummary;
  payment: PaymentSummary | null;
}
/** Confirmación mínima sin identidad del Customer encontrado por teléfono. */
export interface PublicAppointmentResponse extends AvailabilitySlot {
  id: UUID;
  status: AppointmentStatus;
  paymentExpiry: ISODateTime | null;
  branch: Pick<BranchDto, 'name' | 'address' | 'timezone'>;
  service: Pick<ServiceSummary, 'name' | 'durationMin' | 'price'>;
  payment: Pick<PaymentSummary, 'amount'> | null;
}
/** Formato compatible con excepciones y ValidationPipe de Nest. */
export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}
