import type {
  ApiErrorResponse, AppointmentDto, AvailabilityRequest, AvailabilityResponse,
  BranchDto, CreateAppointmentRequest, CreateCustomerRequest,
  CreatePublicAppointmentRequest, CustomerDto, CustomerDetail,
  PublicAppointmentResponse, RescheduleAppointmentRequest,
  PublicTenantDto, PublicServiceDto,
} from '../src';

export const publicTenant = {
  id: '55555555-5555-4555-8555-555555555555', name: 'Negocio de ejemplo',
  slug: 'negocio-ejemplo', logoUrl: null,
  config: { primaryColor: '#123456', secondaryColor: null, welcomeMessage: null, businessCategory: null },
} satisfies PublicTenantDto;
export const publicServices = [{
  id: '33333333-3333-4333-8333-333333333333', name: 'Servicio de ejemplo',
  description: null, durationMin: 90, price: '350', imageUrl: null, color: null,
  category: { id: '77777777-7777-4777-8777-777777777777', name: 'Servicios', order: 0 },
}] satisfies PublicServiceDto[];

// Datos ficticios. 10:00 en Ciudad de México equivale a 16:00Z.
const customerId = '11111111-1111-4111-8111-111111111111';
const branchId = '22222222-2222-4222-8222-222222222222';
const serviceId = '33333333-3333-4333-8333-333333333333';
export const customerInput = {
  firstName: 'Ana', lastName: 'Ejemplo', email: 'ana@example.test', phone: '+525500000001',
} satisfies CreateCustomerRequest;
export const customer = {
  ...customerInput, id: customerId,
  createdAt: '2026-11-19T15:00:00.000Z', updatedAt: '2026-11-19T15:00:00.000Z',
} satisfies CustomerDto;
export const branch = {
  id: branchId, name: 'Sucursal de ejemplo', address: 'Dirección ficticia',
  city: 'Ciudad de México', phone: null, timezone: 'America/Mexico_City',
} satisfies BranchDto;
export const availabilityQuery = {
  branchId, serviceId, date: '2026-11-20',
} satisfies AvailabilityRequest;
// Solo para el selector de reprogramación del panel, junto con JWT ADMIN/STAFF.
export const rescheduleAvailabilityQuery = {
  ...availabilityQuery, excludeAppointmentId: '44444444-4444-4444-8444-444444444444',
} satisfies AvailabilityRequest;
export const availability = [
  { startTime: '2026-11-20T16:00:00.000Z', endTime: '2026-11-20T17:30:00.000Z' },
  { startTime: '2026-11-20T18:00:00.000Z', endTime: '2026-11-20T19:30:00.000Z' },
] satisfies AvailabilityResponse;
export const panelBooking = {
  customerId, branchId, serviceId, startTime: availability[0].startTime,
} satisfies CreateAppointmentRequest;
export const publicBooking = {
  slug: 'negocio-ejemplo', branchId, serviceId, startTime: availability[0].startTime,
  clientInfo: customerInput, termsAccepted: true,
} satisfies CreatePublicAppointmentRequest;
export const reschedule = {
  newStartTime: availability[1].startTime, reason: 'Solicitud del cliente',
} satisfies RescheduleAppointmentRequest;
export const panelResponse = {
  id: '44444444-4444-4444-8444-444444444444',
  tenantId: '55555555-5555-4555-8555-555555555555',
  customerId, branchId, serviceId,
  ...availability[0], status: 'PENDING_PAYMENT', notes: null,
  paymentExpiry: '2026-11-20T15:00:00.000Z', termsAcceptedAt: null,
  customer, branch,
  service: { id: serviceId, name: 'Servicio de ejemplo', durationMin: 90, price: '350.00', color: null },
  payment: {
    id: '66666666-6666-4666-8666-666666666666', amount: '350.00',
    receiptUrl: null, isApproved: false, approvedAt: null,
  },
} satisfies AppointmentDto;
export const publicResponse = {
  id: panelResponse.id, ...availability[0], status: 'PENDING_PAYMENT',
  paymentExpiry: panelResponse.paymentExpiry,
  branch: { name: branch.name, address: branch.address, timezone: branch.timezone },
  service: { name: 'Servicio de ejemplo', durationMin: 90, price: '350.00' },
  payment: { amount: '350.00' },
} satisfies PublicAppointmentResponse;
export const customerDetail = {
  ...customer, totalSpent: 0, appointmentsCount: 1,
  lastVisit: panelResponse.startTime, appointments: [panelResponse],
} satisfies CustomerDetail;
export const errors = {
  slotConflict: { statusCode: 409, message: 'El horario seleccionado ya no está disponible.', error: 'Conflict' },
  termsRequired: { statusCode: 400, message: 'Debe aceptar los términos para reservar.', error: 'Bad Request' },
  foreignCustomer: { statusCode: 404, message: 'Cliente no encontrado.', error: 'Not Found' },
  invalidInput: { statusCode: 400, message: ['email must be an email'], error: 'Bad Request' },
} satisfies Record<string, ApiErrorResponse>;
